const { summarizeDocument } = require('../../services/ollamaService');

/**
 * POST /api/ai/summarize
 * Body: { ocrText: string, maxLength?: number }
 * Résume automatiquement le texte OCR d'un courrier
 */
exports.summarize = async (req, res) => {
  try {
    const { ocrText, maxLength } = req.body;

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        code: 'OCR_TOO_SHORT',
        message: 'Texte OCR insuffisant pour produire un résumé (min 50 caractères)',
      });
    }

    const summaryResult = await summarizeDocument(ocrText, {
      maxLength: typeof maxLength === 'number' ? maxLength : 200,
    });

    return res.json({
      success: true,
      data: summaryResult,
    });
  } catch (error) {
    console.error('[AI Summary] Erreur:', error.code || error.message);

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
          message: 'Le résumé a pris trop de temps. Réessayez.',
        });
      case 'AI_INVALID_JSON':
        return res.status(422).json({
          success: false,
          code: 'AI_INVALID_JSON',
          message: 'L\'IA a renvoyé un format inattendu. Réessayez.',
        });
      case 'OCR_TOO_SHORT':
        return res.status(400).json({
          success: false,
          code: 'OCR_TOO_SHORT',
          message: 'Texte OCR insuffisant (min 50 caractères)',
        });
      default:
        return res.status(500).json({
          success: false,
          code: 'AI_ERROR',
          message: error.message || 'Erreur lors de la génération du résumé',
        });
    }
  }
};
