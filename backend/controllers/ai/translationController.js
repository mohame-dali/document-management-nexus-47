const { translateText } = require('../../services/ollamaService');

/**
 * POST /api/ai/translate
 * Body: { text: string, targetLang?: 'ar' | 'fr' }
 * Traduit fidèlement un texte administratif (AR ↔ FR)
 */
exports.translate = async (req, res) => {
  try {
    const { text, targetLang = 'fr' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        code: 'TEXT_TOO_SHORT',
        message: 'Texte manquant ou trop court pour la traduction (min 5 caractères)',
      });
    }

    const normalizedTarget = targetLang === 'ar' ? 'ar' : 'fr';
    const translationResult = await translateText(text, normalizedTarget);

    return res.json({
      success: true,
      data: translationResult,
    });
  } catch (error) {
    console.error('[AI Translation] Erreur:', error.code || error.message);

    switch (error.code) {
      case 'AI_SERVICE_DOWN':
        return res.status(503).json({
          success: false,
          code: 'AI_SERVICE_DOWN',
          message: 'Le service IA local n\'est pas accessible. Vérifiez qu\'Ollama est lancé.',
        });
      case 'AI_TIMEOUT':
        return res.status(504).json({
          success: false,
          code: 'AI_TIMEOUT',
          message: 'La traduction a pris trop de temps. Réessayez.',
        });
      case 'AI_INVALID_JSON':
        return res.status(422).json({
          success: false,
          code: 'AI_INVALID_JSON',
          message: 'L\'IA a renvoyé une réponse invalide lors de la traduction.',
        });
      case 'TEXT_TOO_SHORT':
        return res.status(400).json({
          success: false,
          code: 'TEXT_TOO_SHORT',
          message: 'Texte insuffisant pour traduire',
        });
      default:
        return res.status(500).json({
          success: false,
          code: 'AI_ERROR',
          message: error.message || 'Erreur lors de la traduction du texte',
        });
    }
  }
};
