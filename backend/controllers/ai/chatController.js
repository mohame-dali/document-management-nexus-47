const SemanticIndex = require('../../models/SemanticIndex');
const { getEmbedding, cosineSimilarity, chat } = require('../../services/ollamaService');

// ═══════════════════════════════════════════════════════════════
// RBAC — Rôles et portées d'accès
// ═══════════════════════════════════════════════════════════════

const GLOBAL_ACCESS_ROLES = [
  'Admin',
  'Director',
  'AdminTuningDesk',
];

/**
 * Résout le département actif d'un utilisateur
 */
function resolveUserDepartment(user) {
  if (!user) return null;
  
  // activeDepartment (peuplé ou ObjectId brut)
  const active = user.activeDepartment;
  if (active) {
    return active._id || active;
  }
  
  // Fallback : premier département de la liste
  if (Array.isArray(user.departments) && user.departments.length > 0) {
    const first = user.departments[0];
    return first._id || first;
  }
  
  return null;
}

/**
 * Construit le filtre de sécurité selon le rôle
 * @param {Object} user - req.user
 * @returns {Object} - Filtre MongoDB
 */
function buildSecurityFilter(user) {
  if (!user) {
    console.warn('[RAG Security] ⚠️ No user → DENIED');
    return { _id: null };
  }

  // 🌍 Rôles globaux : aucun filtre
  if (GLOBAL_ACCESS_ROLES.includes(user.role)) {
    console.log(`[RAG Security] 🌍 ${user.role} → accès GLOBAL`);
    return {};
  }

  // 🏢 Rôles département : filtre strict
  const userDept = resolveUserDepartment(user);
  
  if (!userDept) {
    console.warn(`[RAG Security] ⚠️ ${user.role} sans département → DENIED`);
    return { _id: null };
  }

  console.log(`[RAG Security] 🏢 ${user.role} → filtre dept ${userDept}`);

  // Le document doit être dans le département :
  // - Soit via departmentIds (entrants, array)
  // - Soit via departmentId (sortants, singulier)
  return {
    $or: [
      { 'metadata.departmentIds': userDept },
      { 'metadata.departmentId': userDept },
    ],
  };
}

/**
 * Recherche sémantique + résumé IA
 * POST /api/ai/chat
 * Body: { query: string, yearFilter?: number, typeFilter?: string, limit?: number }
 */
exports.chatSearch = async (req, res) => {
  try {
    const { query, yearFilter, typeFilter, limit = 5 } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        code: 'QUERY_TOO_SHORT',
        message: 'La question doit contenir au moins 3 caractères',
      });
    }

    const searchQuery = query.trim();
    console.log(`[AI Chat] Requête : "${searchQuery}"`);

    // ─── 1. CONVERTIR LA REQUÊTE EN VECTEUR ───
    let queryEmbedding;
    try {
      queryEmbedding = await getEmbedding(searchQuery);
    } catch (err) {
      console.error('[AI Chat] Erreur embedding:', err.message);
      return res.status(500).json({
        success: false,
        code: 'EMBEDDING_ERROR',
        message: 'Impossible de convertir la requête',
      });
    }

    // ─── 2. RÉCUPÉRER TOUS LES VECTEURS INDEXÉS ───
    const securityFilter = buildSecurityFilter(req.user);

    const filter = {
      ...securityFilter,
    };

    if (typeFilter === 'incoming' || typeFilter === 'outgoing') {
      filter.documentType = typeFilter;
    }
    if (yearFilter) {
      filter['metadata.year'] = yearFilter;
    }

    console.log(`[RAG Security] Filter:`, JSON.stringify(filter));

    const allIndexed = await SemanticIndex.find(filter).lean();

    if (allIndexed.length === 0) {
      return res.json({
        success: true,
        data: {
          query: searchQuery,
          summary: 'لا توجد وثائق مفهرسة بعد. يرجى فهرسة الوثائق أولاً.',
          totalFound: 0,
          sources: [],
        },
      });
    }

    console.log(`[AI Chat] ${allIndexed.length} vecteurs comparés`);

    // ─── 3. CALCULER SIMILARITÉ COSINUS ───
    const scored = allIndexed
      .map(item => ({
        documentType: item.documentType,
        documentId: item.documentId.toString(),
        metadata: item.metadata,
        sourceText: item.sourceText,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .filter(item => item.score > 0.5) // Seuil de pertinence
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`[AI Chat] ${scored.length} documents pertinents trouvés`);

    // ─── 4. GÉNÉRER RÉSUMÉ IA (si documents trouvés) ───
    let summary = '';

    if (scored.length === 0) {
      summary = `لم أجد أي وثيقة مطابقة لـ "${searchQuery}". جرّب صياغة مختلفة.`;
    } else {
      // Construire le contexte pour le LLM
      const contextLines = scored.map((s, i) => {
        const m = s.metadata || {};
        const dateStr = m.documentDate 
          ? new Date(m.documentDate).toLocaleDateString('fr-FR') 
          : 'Date inconnue';
        return `[${i + 1}] ${m.subject || 'بدون عنوان'} — من: ${m.source || '—'} — رقم: ${m.serialNumber || '?'}/${m.year || '?'} — تاريخ: ${dateStr} — النوع: ${s.documentType === 'incoming' ? 'وارد' : 'صادر'} — درجة الصلة: ${(s.score * 100).toFixed(0)}%`;
      }).join('\n');

      const systemPrompt = `Tu es un assistant administratif tunisien.
Réponds UNIQUEMENT en te basant sur les documents fournis.
RÈGLES STRICTES :
1. Ne JAMAIS inventer de document, numéro ou date.
2. Si le score de pertinence est < 60%, indique que tu n'es pas sûr.
3. Si AUCUN document n'est pertinent, réponds : "لم أجد أي وثيقة مطابقة لسؤالك."
4. Ne cite QUE les documents dont le score est > 50%.
5. Réponds en arabe administratif clair et concis.`;

      const userPrompt = `سؤال المستخدم: "${searchQuery}"

عدد الوثائق الموجودة: ${scored.length}

قائمة الوثائق:
${contextLines}

اكتب إجابة موجزة (3-5 أسطر) بالإجابة على السؤال مع ذكر:
1. عدد الوثائق والموضوع العام
2. المراجع الأساسية (الأرقام والتواريخ)
3. أي تفاصيل مهمة

اكتب بالإيجاز والوضوح.`;

      try {
        summary = await chat(userPrompt, systemPrompt, {
          temperature: 0.3,
          maxTokens: 600,
        });
        console.log('[AI Chat] Résumé généré avec succès');
      } catch (err) {
        console.error('[AI Chat] Erreur LLM:', err.message);
        summary = `وجدت ${scored.length} وثيقة مطابقة لـ "${searchQuery}". راجع القائمة أدناه.`;
      }
    }

    // ─── 5. PRÉPARER LES SOURCES POUR LE FRONTEND ───
    const sources = scored.map(s => ({
      documentId: s.documentId,
      documentType: s.documentType,
      subject: s.metadata?.subject || 'بدون عنوان',
      source: s.metadata?.source || '',
      serialNumber: s.metadata?.serialNumber || '',
      year: s.metadata?.year || null,
      date: s.metadata?.documentDate || null,
      score: Math.round(s.score * 100) / 100,
    }));

    // ─── 6. RÉPONSE ───
    res.json({
      success: true,
      data: {
        query: searchQuery,
        summary,
        totalFound: sources.length,
        sources,
        filters: {
          yearFilter: yearFilter || null,
          typeFilter: typeFilter || null,
        },
      },
    });
  } catch (error) {
    console.error('[AI Chat] Erreur:', error.message);
    res.status(500).json({
      success: false,
      code: 'CHAT_ERROR',
      message: error.message || 'Erreur lors de la recherche',
    });
  }
};
