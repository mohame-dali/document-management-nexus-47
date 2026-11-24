# Glossaire et corrections orthographiques à valider

> **Document de validation (read-only) :** Aucune modification n'a été appliquée au code ni à `src/i18n/locales/ar.json`. Merci de renseigner vos arbitrages dans la colonne **Choix du propriétaire** avant toute mise à jour.

---

## 1. Glossaire terminologique (15 concepts les plus fréquents)

| Concept (français) | Variantes actuelles | 2 propositions maximum | Choix du propriétaire |
|---|---|---|---|
| **Courrier entrant** | الوثائق الواردة / المراسلات الواردة / المستندات الواردة / البريد الوارد / المعاملات الواردة | 1) **المراسلات الواردة** 2) **الوثائق الواردة** | |
| **Courrier sortant** | الوثائق الصادرة / المراسلات الصادرة / المستندات الصادرة / البريد الصادر | 1) **المراسلات الصادرة** 2) **الوثائق الصادرة** | |
| **Bureau d'ordre** | مكتب الضبط / مكتب الضبط والتوثيق / مكتب التنسيق / مركز رقمنة الوثائق / مدير المكتب / مدراء المكاتب | 1) **مكتب الضبط** *(rôle : مسؤول مكتب الضبط)* 2) **مكتب الضبط والتوثيق** | |
| **Département** | قسم / مصلحة / وحدة وظيفية / إدارة | 1) **قسم** 2) **مصلحة** | |
| **Dossier** *(classement vs RH)* | مجلد / ملف / بطاقة | 1) **مجلد** *(classement)* / **ملف** *(RH)* 2) **مجلد** *(partout sauf fichiers)* | |
| **Archive / Archiver** | أرشيف / الأرشيف / أرشفة / مؤرشفة / تصنيف / مصنفة | 1) **الأرشيف / أرشفة** *(et تصنيف pour dossier)* 2) **الأرشيف / تصنيف** | |
| **Assigner un responsable** | تعيين مسؤول / تحديد المسؤول / تحويل / إسناد / تكليف | 1) **تعيين مسؤول** 2) **تكليف مسؤول** | |
| **Transférer / Orienter** *(courrier)* | توجيه / تحويل / إحالة / تخصيص | 1) **توجيه** *(service)* / **إحالة** *(transfert)* 2) **تحويل** *(unifié)* | |
| **Réponse / Répondu** | رد / الرد الرسمي / إجابة / تم الرد عليها (مُجاب) / مُجاب | 1) **رد** *(statut : تم الرد عليها)* 2) **رد رسمي** *(statut : مُجاب عنها)* | |
| **Utilisateur** *(système vs RH)* | مستخدم / مستخدم عادي / موظف / منسوبي / الزميل | 1) **مستخدم** *(compte)* / **موظف** *(RH)* 2) **مستخدم** *(unifié hors RH)* | |
| **Rôles (RBAC)** | المدير العام / مدير الإدارة ; مدير النظام / مدير / الإدارة العامة ; مدير القسم ; مكتب التنسيق / مدير المكتب ; مستخدم / موظف | 1) **المدير العام، مدير النظام، مدير القسم، مسؤول مكتب الضبط، مستخدم** 2) **مدير الإدارة، مدير النظام، مدير القسم، مدير مكتب الضبط، مستخدم** *(sans suffixes anglais)* | |
| **Filtre / Filtrer** | التصفية / فلترة / الفلاتر / المرشحات | 1) **التصفية** *(nom : عوامل التصفية)* 2) **المرشحات** | |
| **Mois du calendrier** | جانفي، فيفري، أفريل، ماي، جوان، جويلية، أوت... *(forme algéro-tunisienne)* | 1) **جانفي، فيفري، مارس، أفريل...** *(maghrébin)* 2) **يناير، فبراير، مارس، أبريل...** *(arabe standard)* | |
| **Unité de taille (Mo)** | ميغابايت / ميجابايت / ميغا / م.ب | 1) **ميغابايت** *(abrégé : م.ب)* 2) **ميجابايت** *(abrégé : م.ب)* | |
| **Stage / Stagiaire** *(RH)* | التربص / التربصات / المتربص | 1) **التربص / التربصات** *(maghrébin administratif)* 2) **التدريب / الدورات التدريبية** | |

---

## 2. Fautes d'orthographe et d'accord évidentes (à valider avant correction)

| fichier:ligne | actuel | corrigé | raison |
|---|---|---|---|
| `src/i18n/locales/ar.json:23` | المستخدمون غير النشطون | المستخدمون غير النشطين | Accord du complément d'annexion (`مضاف إليه`) après `غير` au génitif. |
| `src/i18n/locales/ar.json:24` | المدراء | المديرون | Pluriel régulier correct de « مدير » (`مدراء` est un pluriel fautif sur *fuʿalāʾ*). |
| `src/i18n/locales/ar.json:25` | مدراء الأقسام | مديرو الأقسام | Même faute de pluriel (et incohérence avec `مديرو الأقسام` à `ar.json:563`). |
| `src/i18n/locales/ar.json:26` | مدراء المكاتب | مديرو المكاتب *(ou مسؤولو مكتب الضبط)* | Même faute de pluriel (`مدراء` → `مديرو`). |
| `src/i18n/locales/ar.json:769` | المشرفون والمدراء | المشرفون والمديرون | Même faute de pluriel (`مدراء` → `مديرون`). |
| `src/i18n/locales/ar.json:919` | المشرفون والمدراء | المشرفون والمديرون | Même faute de pluriel (`مدراء` → `مديرون`). |
| `src/i18n/locales/ar.json:53` | تخصيص والرد على الوثائق | تخصيص الوثائق والرد عليها | Rupture syntaxique de l'annexion (`إضافة`) devant la conjonction `و`. |
| `src/i18n/locales/ar.json:228` | الجهة الراسلة: | الجهة المرسِلة: | Participe fautif/rare (`راسلة` au lieu de `مرسِلة`, forme IV). |
| `src/i18n/locales/ar.json:408` | الوثيقة الصادرة كـ رد | الوثيقة الصادرة بوصفها رداً *(ou وثيقة الرد الصادرة)* | La préposition `كـ` ne s'écrit pas détachée avec une espace ni suivi d'un nom indéfini ainsi. |
| `src/pages/guide/InstallationGuidePage.tsx:272` | تحديد كـ مكتمل | تحديد كمكتمل *(ou وضع علامة «مكتمل»)* | La préposition `كـ` doit être attachée au mot qui la suit (sans espace). |
| `src/pages/guide/InstallationGuidePage.tsx:344` | إلغاء التحديد كـ مكتمل | إلغاء علامة الاكتمال *(ou إلغاء التحديد كمكتمل)* | La préposition `كـ` doit être attachée au mot qui la suit (sans espace). |
| `src/i18n/locales/ar.json:741` | تم إعادة التعيين | تمت إعادة التعيين *(ou تمت إعادة الضبط)* | Accord en genre : « إعادة » est féminin, le verbe doit être `تمت`. |
| `src/pages/settings/BackupSettingsPage.tsx:124` | تم إعادة تحميل الجدول الزمني | تمت إعادة تحميل الجدول الزمني | Accord en genre : « إعادة » est féminin (`تمت`). |
| `src/components/audit/AuditTrailViewer.tsx:47` | تم إعادة تعيين المرشحات | تمت إعادة ضبط التصفية *(ou المرشحات)* | Accord en genre : « إعادة » est féminin (`تمت`). |
| `src/i18n/locales/ar.json:743` | دبل-كليك للتصفير | انقر نقراً مزدوجاً لإعادة الضبط | Emprunt anglais familier translittéré (`دبل-كليك`) dans une interface officielle. |
| `src/i18n/locales/ar.json:835` | Accès refusé — Seul l'administrateur système peut créer des comptes | تم رفض الوصول — يقتصر إنشاء الحسابات على مدير النظام فقط | Chaîne restée en français pur dans `ar.json`. |
| `src/i18n/locales/ar.json:859` | Accès refusé — Seul l'administrateur système peut modifier des comptes | تم رفض الوصول — يقتصر تعديل الحسابات على مدير النظام فقط | Chaîne restée en français pur dans `ar.json`. |
| `src/i18n/locales/ar.json:1161` | للإطلاع والإفادة | للاطلاع والإفادة | *Hamzat al-waṣl* : le nom verbal `اطلاع` (forme VIII) s'écrit sans hamza sous l'alif (`للاطلاع`). |
| `src/pages/documents/ViewOutgoingDocument.tsx:677` | نسخ للإعلام والإطلاع | نسخ للإعلام والاطلاع | *Hamzat al-waṣl* fautive sur `الإطلاع` (`والاطلاع` sans hamza). |
| `src/pages/documents/ViewOutgoingDocument.tsx:1309` | إرسال نسخ للإعلام والإطلاع | إرسال نسخ للإعلام والاطلاع | *Hamzat al-waṣl* fautive sur `الإطلاع` (`والاطلاع` sans hamza). |
| `src/components/attendance/MyCalendarMonthView.tsx:53` | الإثنين | الاثنين | *Hamzat al-waṣl* normative sur le nom du jour `الاثنين` (sans hamza sous l'alif). |
| `src/components/attendance/MyCalendarWeekView.tsx:19` | الإثنين | الاثنين | *Hamzat al-waṣl* normative sur `الاثنين` (sans hamza). |
| `src/components/attendance/AllPersonnelWeekView.tsx:50` | الإثنين | الاثنين | *Hamzat al-waṣl* normative sur `الاثنين` (sans hamza). |
| `src/utils/arabicDateFormatter.ts:13` | الإثنين | الاثنين | *Hamzat al-waṣl* normative sur `الاثنين` (sans hamza). |
| `src/i18n/locales/ar.json:109` *(et :150, :883)* | ضوئيًا / موظفًا | ضوئياً / موظفاً | Homogénéité typographique du *tanwīn al-fatḥ* : placé après l'alif alors que tout le reste du fichier le place avant (`اً`). |
