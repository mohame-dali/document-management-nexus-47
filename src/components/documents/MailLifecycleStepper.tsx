import React from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  FileCheck2,
  FolderOpen,
  Link2,
  Loader2,
  ScanText,
  Send,
  UserCheck,
} from 'lucide-react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

export interface MailLifecycleStepperProps {
  type: 'incoming' | 'outgoing';
  document: IncomingDocument | OutgoingDocument;
  answerDocument?: OutgoingDocument | null;
  referenceDocument?: IncomingDocument | null;
}

type StepVisualState = 'completed' | 'processing' | 'warning' | 'current' | 'pending';

interface LifecycleStep {
  key: string;
  number: number;
  title: string;
  subtitle: string;
  state: StepVisualState;
  icon: React.ComponentType<{ className?: string }>;
  badges?: string[];
  highlighted?: boolean;
}

const MailLifecycleStepper: React.FC<MailLifecycleStepperProps> = ({
  type,
  document,
  answerDocument,
  referenceDocument,
}) => {
  const { t } = useLanguage();

  const buildIncomingSteps = (doc: IncomingDocument): LifecycleStep[] => {
    const hasCreated = Boolean(doc.createdAt);
    const hasPdf = Boolean(doc.scannedDocument);

    // Step 2: OCR & AI Indexed
    let step2State: StepVisualState = 'pending';
    let step2Subtitle = t('documents.lifecycle.incoming.step2.pending');
    if (doc.ocrStatus === 'failed') {
      step2State = 'warning';
      step2Subtitle = t('documents.lifecycle.incoming.step2.failed');
    } else if (doc.ocrStatus === 'processing' || doc.ocrStatus === 'pending') {
      step2State = 'processing';
      step2Subtitle = t('documents.lifecycle.incoming.step2.processing');
    } else if (doc.ocrStatus === 'completed' || Boolean(doc.ocrText) || Boolean(doc.isIndexed)) {
      step2State = 'completed';
      if (doc.isIndexed && (doc.ocrText || doc.ocrStatus === 'completed')) {
        step2Subtitle = t('documents.lifecycle.incoming.step2.ocrAndAi');
      } else if (doc.isIndexed) {
        step2Subtitle = t('documents.lifecycle.incoming.step2.aiOnly');
      } else {
        step2Subtitle = t('documents.lifecycle.incoming.step2.ocrOnly');
      }
    }

    // Step 3: Department Routed
    const assignedDepts = Array.isArray(doc.assignedTo)
      ? doc.assignedTo.map((d) => d?.name).filter((name): name is string => Boolean(name))
      : [];
    const hasDepartments = assignedDepts.length > 0;

    // Step 4: In Processing / Assigned
    const populatedAnswer =
      typeof doc.answer === 'object' && doc.answer !== null ? doc.answer : null;
    const isAnswerDeleted = Boolean(populatedAnswer?.isDeleted);
    const activeAnswer = !isAnswerDeleted
      ? answerDocument || populatedAnswer || (typeof doc.answer === 'string' && doc.answer ? doc.answer : null) || doc.referenceId || null
      : null;

    const responsibleName =
      typeof doc.responsibleUser === 'object' && doc.responsibleUser !== null
        ? doc.responsibleUser.username
        : typeof doc.responsibleUser === 'string' && doc.responsibleUser
          ? doc.responsibleUser
          : null;

    const statusLower = String(doc.status || '').toLowerCase();
    const isProcessedStatus = ['in_progress', 'in-progress', 'processed', 'completed', 'replied', 'answered'].includes(
      statusLower
    );
    const isStep4Complete = Boolean(responsibleName) || isProcessedStatus || Boolean(activeAnswer);

    let step4Subtitle = t('documents.lifecycle.incoming.step4.pending');
    if (responsibleName) {
      step4Subtitle = t('documents.lifecycle.incoming.step4.assignedTo', { name: responsibleName });
    } else if (isProcessedStatus || activeAnswer) {
      step4Subtitle = t('documents.lifecycle.incoming.step4.inProgress');
    }

    // Step 5: Answered / Archived
    const folderName =
      typeof doc.folder === 'object' && doc.folder !== null ? doc.folder.name : null;
    const hasFolder = Boolean(doc.folder);
    const isStep5Complete = Boolean(activeAnswer) || hasFolder;

    let step5State: StepVisualState = 'pending';
    let step5Subtitle = t('documents.lifecycle.incoming.step5.pending');
    if (isStep5Complete) {
      step5State = 'completed';
      const parts: string[] = [];
      if (activeAnswer) {
        if (typeof activeAnswer === 'object' && 'serialNumber' in activeAnswer) {
          parts.push(
            t('documents.lifecycle.incoming.step5.replyNum', {
              serial: activeAnswer.serialNumber,
              year: activeAnswer.year,
            })
          );
        } else {
          parts.push(t('documents.lifecycle.incoming.step5.replyLinked'));
        }
      }
      if (hasFolder) {
        parts.push(
          t('documents.lifecycle.incoming.step5.archivedIn', {
            folder: folderName || t('documents.viewIncoming.fallback.specificFolder'),
          })
        );
      }
      step5Subtitle = parts.join(' · ');
    } else if (isAnswerDeleted) {
      step5State = 'warning';
      step5Subtitle = t('documents.lifecycle.incoming.step5.replyInTrash');
    }

    const rawSteps: LifecycleStep[] = [
      {
        key: 'registered',
        number: 1,
        title: t('documents.lifecycle.incoming.step1.title'),
        subtitle: hasPdf
          ? t('documents.lifecycle.incoming.step1.withPdf')
          : t('documents.lifecycle.incoming.step1.noPdf'),
        state: hasCreated ? 'completed' : 'pending',
        icon: FileCheck2,
      },
      {
        key: 'ocr_ai',
        number: 2,
        title: t('documents.lifecycle.incoming.step2.title'),
        subtitle: step2Subtitle,
        state: step2State,
        icon: ScanText,
      },
      {
        key: 'routed',
        number: 3,
        title: t('documents.lifecycle.incoming.step3.title'),
        subtitle: hasDepartments ? '' : t('documents.lifecycle.incoming.step3.pending'),
        state: hasDepartments ? 'completed' : 'pending',
        icon: Building2,
        badges: assignedDepts,
      },
      {
        key: 'processing',
        number: 4,
        title: t('documents.lifecycle.incoming.step4.title'),
        subtitle: step4Subtitle,
        state: isStep4Complete ? 'completed' : 'pending',
        icon: UserCheck,
      },
      {
        key: 'answered_archived',
        number: 5,
        title: t('documents.lifecycle.incoming.step5.title'),
        subtitle: step5Subtitle,
        state: step5State,
        icon: FolderOpen,
      },
    ];

    // Mark the first pending step after a completed step as 'current' for clear progression cues
    let assignedCurrent = false;
    return rawSteps.map((step, index) => {
      if (step.state === 'pending' && !assignedCurrent) {
        const prevCompleted = index === 0 || rawSteps[index - 1].state === 'completed';
        if (prevCompleted) {
          assignedCurrent = true;
          return { ...step, state: 'current' };
        }
      }
      return step;
    });
  };

  const buildOutgoingSteps = (doc: OutgoingDocument): LifecycleStep[] => {
    const hasCreated = Boolean(doc.createdAt);
    const hasPdf = Boolean(doc.scannedDocument);

    // Step 2: Scanned & OCR Ready
    let step2State: StepVisualState = 'pending';
    let step2Subtitle = t('documents.lifecycle.outgoing.step2.pending');
    if (doc.ocrStatus === 'failed') {
      step2State = 'warning';
      step2Subtitle = t('documents.lifecycle.outgoing.step2.failed');
    } else if (doc.ocrStatus === 'processing' || doc.ocrStatus === 'pending') {
      step2State = 'processing';
      step2Subtitle = t('documents.lifecycle.outgoing.step2.processing');
    } else if (hasPdf) {
      step2State = 'completed';
      if (doc.isIndexed && (doc.ocrText || doc.ocrStatus === 'completed')) {
        step2Subtitle = t('documents.lifecycle.outgoing.step2.readyWithAi');
      } else if (doc.ocrText || doc.ocrStatus === 'completed') {
        step2Subtitle = t('documents.lifecycle.outgoing.step2.readyWithOcr');
      } else {
        step2Subtitle = t('documents.lifecycle.outgoing.step2.pdfAttached');
      }
    }

    // Step 3: Linked / Dispatched
    const populatedRef =
      typeof doc.reference === 'object' && doc.reference !== null ? doc.reference : null;
    const isRefDeleted = Boolean(populatedRef?.isDeleted);
    const activeRef = !isRefDeleted
      ? referenceDocument || populatedRef || (typeof doc.reference === 'string' && doc.reference ? doc.reference : null) || doc.referenceId || null
      : null;

    const recipientsList = Array.isArray(doc.assignedTo)
      ? doc.assignedTo.filter((r): r is string => Boolean(r))
      : [];
    const hasRecipients = recipientsList.length > 0;

    let step3State: StepVisualState = 'pending';
    let step3Subtitle = t('documents.lifecycle.outgoing.step3.pending');
    const step3Badges: string[] = [];

    if (activeRef || hasRecipients) {
      step3State = 'completed';
      const notes: string[] = [];
      if (activeRef) {
        if (typeof activeRef === 'object' && 'serialNumber' in activeRef) {
          const refLabel = t('documents.lifecycle.outgoing.step3.linkedIncoming', {
            serial: activeRef.serialNumber,
            year: activeRef.year,
          });
          step3Badges.push(refLabel);
        } else {
          step3Badges.push(t('documents.lifecycle.outgoing.step3.linkedSimple'));
        }
      }
      if (hasRecipients) {
        notes.push(
          t('documents.lifecycle.outgoing.step3.dispatchedCount', {
            count: recipientsList.length,
          })
        );
      }
      step3Subtitle = notes.join(' · ');
    } else if (isRefDeleted) {
      step3State = 'warning';
      step3Subtitle = t('documents.lifecycle.outgoing.step3.referenceInTrash');
    }

    // Step 4: Filed / Archived
    const hasFolder = Boolean(doc.folder);
    const folderName =
      typeof doc.folder === 'object' && doc.folder !== null ? doc.folder.name : null;

    const rawSteps: LifecycleStep[] = [
      {
        key: 'drafted',
        number: 1,
        title: t('documents.lifecycle.outgoing.step1.title'),
        subtitle: t('documents.lifecycle.outgoing.step1.registered', {
          serial: doc.serialNumber,
          year: doc.year,
        }),
        state: hasCreated ? 'completed' : 'pending',
        icon: FileCheck2,
      },
      {
        key: 'scanned_ocr',
        number: 2,
        title: t('documents.lifecycle.outgoing.step2.title'),
        subtitle: step2Subtitle,
        state: step2State,
        icon: ScanText,
      },
      {
        key: 'linked_dispatched',
        number: 3,
        title: t('documents.lifecycle.outgoing.step3.title'),
        subtitle: step3Subtitle,
        state: step3State,
        icon: activeRef ? Link2 : Send,
        badges: step3Badges,
        highlighted: Boolean(activeRef),
      },
      {
        key: 'archived',
        number: 4,
        title: t('documents.lifecycle.outgoing.step4.title'),
        subtitle: hasFolder
          ? folderName
            ? t('documents.lifecycle.outgoing.step4.filedIn', { folder: folderName })
            : t('documents.lifecycle.outgoing.step4.filedGeneric')
          : t('documents.lifecycle.outgoing.step4.pending'),
        state: hasFolder ? 'completed' : 'pending',
        icon: FolderOpen,
      },
    ];

    let assignedCurrent = false;
    return rawSteps.map((step, index) => {
      if (step.state === 'pending' && !assignedCurrent) {
        const prevCompleted = index === 0 || rawSteps[index - 1].state === 'completed';
        if (prevCompleted) {
          assignedCurrent = true;
          return { ...step, state: 'current' };
        }
      }
      return step;
    });
  };

  const steps =
    type === 'incoming'
      ? buildIncomingSteps(document as IncomingDocument)
      : buildOutgoingSteps(document as OutgoingDocument);

  const completedCount = steps.filter((s) => s.state === 'completed').length;
  const gridColsClass = type === 'incoming' ? 'md:grid-cols-5' : 'md:grid-cols-4';

  const getNodeClasses = (state: StepVisualState) => {
    switch (state) {
      case 'completed':
        return 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500 text-white';
      case 'processing':
        return 'bg-[#ebf4ff] dark:bg-blue-950/70 border-[#2c5282] dark:border-blue-400 text-[#2c5282] dark:text-blue-300';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300';
      case 'current':
        return 'bg-[#ebf4ff]/70 dark:bg-blue-950/40 border-[#2c5282] dark:border-blue-400 text-[#2c5282] dark:text-blue-300';
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const renderNodeIcon = (step: LifecycleStep) => {
    if (step.state === 'completed') {
      return <Check className="h-4 w-4 stroke-[2.5]" />;
    }
    if (step.state === 'processing') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (step.state === 'warning') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (step.state === 'current') {
      return <Clock className="h-4 w-4" />;
    }
    const StepIcon = step.icon;
    return <StepIcon className="h-4 w-4" />;
  };

  return (
    <section
      aria-label={t('documents.lifecycle.title')}
      className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded p-4 sm:p-5 print:hidden"
    >
      {/* Top Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1a202c] dark:text-slate-100">
          <span>{t('documents.lifecycle.title')}</span>
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          {t('documents.lifecycle.progress', {
            completed: completedCount,
            total: steps.length,
          })}
        </span>
      </div>

      {/* Horizontal Stepper on md+, Vertical on mobile */}
      <ol className={`grid grid-cols-1 ${gridColsClass} gap-4 md:gap-2`}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const connectorFilled = step.state === 'completed';

          return (
            <li key={step.key} className="relative flex md:flex-col items-start md:items-center gap-3 md:gap-2.5">
              {/* Mobile Vertical Connector */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`md:hidden absolute top-9 bottom-[-1rem] start-[17px] w-0.5 ${
                    connectorFilled
                      ? 'bg-emerald-500 dark:bg-emerald-500/80'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}

              {/* Desktop Horizontal Connector */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`hidden md:block absolute top-[17px] start-[calc(50%+22px)] end-[calc(-50%+22px)] h-0.5 ${
                    connectorFilled
                      ? 'bg-emerald-500 dark:bg-emerald-500/80'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}

              {/* Step Node */}
              <div
                className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${getNodeClasses(
                  step.state
                )}`}
              >
                {renderNodeIcon(step)}
              </div>

              {/* Step Copy & Badges */}
              <div className="min-w-0 flex-1 md:text-center md:px-1.5 space-y-1">
                <div className="flex items-center md:justify-center gap-1.5">
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {step.number}.
                  </span>
                  <p
                    className={`text-xs sm:text-sm font-bold leading-snug ${
                      step.state === 'completed'
                        ? 'text-[#1a202c] dark:text-slate-100'
                        : step.state === 'warning'
                          ? 'text-amber-800 dark:text-amber-300'
                          : step.state === 'processing' || step.state === 'current'
                            ? 'text-[#2c5282] dark:text-blue-400'
                            : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>

                {step.subtitle && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed tabular-nums">
                    {step.subtitle}
                  </p>
                )}

                {step.badges && step.badges.length > 0 && (
                  <div className="flex flex-wrap items-center md:justify-center gap-1 pt-0.5">
                    {step.badges.slice(0, 2).map((badgeText, bIdx) => (
                      <span
                        key={bIdx}
                        title={badgeText}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[13px] font-semibold max-w-[160px] truncate border ${
                          step.highlighted
                            ? 'bg-[#ebf4ff] dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border-[#bee3f8] dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {badgeText}
                      </span>
                    ))}
                    {step.badges.length > 2 && (
                      <span
                        title={step.badges.slice(2).join(', ')}
                        className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums px-1"
                      >
                        +{step.badges.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default MailLifecycleStepper;
