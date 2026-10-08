const { extractDocumentInfo, checkOllamaHealth } = require('../../services/ollamaService');

/**
 * GET /api/ai/health
 * Vérifie que le service IA est opérationnel
 */
exports.health = async (req, res) => {
  try {
    const health = await checkOllamaHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 'HEALTH_CHECK_ERROR',
      message: 'Erreur lors de la vérification',
    });
  }
};

/**
 * POST /api/ai/extract-from-ocr
 * Body: { ocrText: string }
 * Retourne les champs extraits du courrier
 */
exports.extractFromOcr = async (req, res) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText || ocrText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        code: 'OCR_TOO_SHORT',
        message: 'Texte OCR manquant ou trop court (min 20 caractères)',
      });
    }

    const extracted = await extractDocumentInfo(ocrText);

    return res.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('[AI Extraction] Erreur:', error.code || error.message);

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
          message: 'L\'extraction a pris trop de temps. Réessayez.',
        });
      case 'AI_INVALID_JSON':
        return res.status(422).json({
          success: false,
          code: 'AI_INVALID_JSON',
          message: 'L\'IA a renvoyé une réponse invalide. Réessayez.',
        });
      case 'OCR_TOO_SHORT':
        return res.status(400).json({
          success: false,
          code: 'OCR_TOO_SHORT',
          message: 'Texte OCR insuffisant',
        });
      default:
        return res.status(500).json({
          success: false,
          code: 'AI_ERROR',
          message: 'Erreur lors de l\'extraction',
        });
    }
  }
};
