/**
 * backend/scripts/seedDatabaseMultiYear.js
 * Script de réinitialisation et seeding complet multi-années (2024, 2025, 2026)
 *
 * RÈGLES & OBJECTIFS :
 * 1. Connexion MongoDB via MONGODB_URI (dotenv chargé)
 * 2. Purge propre des collections (Department, User, Personnel, IncomingDocument, OutgoingDocument, OrganizationSettings)
 * 3. Mot de passe conforme aux règles de sécurité (8+ chars, majuscule, chiffre) : ex: Admin123!
 * 4. Création des 4 départements (Direction, Ressources Humaines, Bureau d'Ordre, Informatique)
 * 5. Création des 4 utilisateurs clés (Admin, Director, AdminDepartment, AdminTuningDesk)
 * 6. Création de 10 fiches Personnel réalistes (noms arabes/français, CIN uniques)
 * 7. Génération de courriers entrants (10/an) et sortants (5/an) pour [2024, 2025, 2026]
 * 8. Utilisation de new Model({...}) + await doc.save() pour déclencher les hooks post('save') RAG
 * 9. Temporisation de 500ms entre chaque sauvegarde pour laisser l'IA indexer sans saturer le processeur
 * 10. Affichage d'un récapitulatif complet et fermeture propre du processus
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Charger les variables d'environnement (.env racine puis .env backend si présent)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const Department = require('../models/Department');
const User = require('../models/User');
const Personnel = require('../models/Personnel');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const OrganizationSettings = require('../models/OrganizationSettings');

// Helper pour attendre un délai donné (ms)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seedDatabaseMultiYear() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';
  console.log('======================================================================');
  console.log('🚀 DÉMARRAGE DU SCRIPT DE SEEDING MULTI-ANNÉES (2024, 2025, 2026)');
  console.log(`🔗 Connexion MongoDB : ${dbUri.split('@').pop()}`);
  console.log('======================================================================\n');

  try {
    await mongoose.connect(dbUri);
    console.log('✅ Connecté avec succès à MongoDB.');

    // ------------------------------------------------------------------
    // ÉTAPE 1 : Nettoyage des collections existantes
    // ------------------------------------------------------------------
    console.log('\n🧹 ÉTAPE 1 : Nettoyage des collections...');
    await Department.deleteMany({});
    await User.deleteMany({});
    await Personnel.deleteMany({});
    await IncomingDocument.deleteMany({});
    await OutgoingDocument.deleteMany({});
    await OrganizationSettings.deleteMany({});
    console.log('✅ Collections Department, User, Personnel, IncomingDocument, OutgoingDocument, OrganizationSettings vidées.');

    // ------------------------------------------------------------------
    // ÉTAPE 2 : Création des 4 départements
    // ------------------------------------------------------------------
    console.log('\n🏢 ÉTAPE 2 : Création des départements...');
    const depDirection = new Department({
      name: 'Direction Générale',
      description: 'Direction Générale et Bureau de Commandement (DIR)'
    });
    await depDirection.save();

    const depRH = new Department({
      name: 'Ressources Humaines',
      description: 'Direction des Ressources Humaines, Formation et Carrières (RH)'
    });
    await depRH.save();

    const depBO = new Department({
      name: "Bureau d'Ordre",
      description: "Bureau d'Ordre Central - Gestion des flux courriers entrants et sortants (BO)"
    });
    await depBO.save();

    const depIT = new Department({
      name: 'Informatique & Télécoms',
      description: 'Division des Systèmes d\'Information, Réseaux et Technologies (IT)'
    });
    await depIT.save();

    console.log(`✅ 4 départements créés :`);
    console.log(`   - Direction Générale (ID: ${depDirection._id})`);
    console.log(`   - Ressources Humaines (ID: ${depRH._id})`);
    console.log(`   - Bureau d'Ordre (ID: ${depBO._id})`);
    console.log(`   - Informatique & Télécoms (ID: ${depIT._id})`);

    // Configuration des paramètres d'organisation
    const orgSettings = new OrganizationSettings({
      nomAdministration: 'Administration Publique Centrale',
      rhDepartmentId: depRH._id,
      bureauOrdreDepartmentId: depBO._id,
      bureauDirecteurDepartmentId: depDirection._id
    });
    await orgSettings.save();
    console.log('✅ Paramètres d\'organisation initialisés (RH & BO configurés).');

    // ------------------------------------------------------------------
    // ÉTAPE 3 : Création des utilisateurs clés
    // ------------------------------------------------------------------
    console.log('\n👥 ÉTAPE 3 : Création des utilisateurs...');
    // Note: Le modèle User possède un hook pre('save') qui hash automatiquement 'password' avec bcrypt
    const allDeptIds = [depDirection._id, depRH._id, depBO._id, depIT._id];

    // 1. Admin
    const userAdmin = new User({
      username: 'admin',
      password: 'Admin123!',
      role: 'Admin',
      departments: allDeptIds,
      activeDepartment: depDirection._id,
      isActive: true,
      mustChangePassword: false
    });
    await userAdmin.save();

    // 2. Director
    const userDirector = new User({
      username: 'director',
      password: 'Director123!',
      role: 'Director',
      departments: [depDirection._id],
      activeDepartment: depDirection._id,
      isActive: true,
      mustChangePassword: false
    });
    await userDirector.save();

    // 3. Chef RH (AdminDepartment)
    const userRH = new User({
      username: 'rh_manager',
      password: 'RhManager123!',
      role: 'AdminDepartment',
      departments: [depRH._id],
      activeDepartment: depRH._id,
      isActive: true,
      mustChangePassword: false
    });
    await userRH.save();

    // 4. Chef BO (AdminTuningDesk) - Règle stricte : departments: [] et activeDepartment: null
    const userBO = new User({
      username: 'bo_manager',
      password: 'BoManager123!',
      role: 'AdminTuningDesk',
      departments: [],
      activeDepartment: null,
      isActive: true,
      mustChangePassword: false
    });
    await userBO.save();

    console.log('✅ 4 utilisateurs créés :');
    console.log('   - admin       (Admin)          | Mot de passe: Admin123!');
    console.log('   - director    (Director)       | Mot de passe: Director123!');
    console.log('   - rh_manager  (AdminDepartment)| Mot de passe: RhManager123!');
    console.log('   - bo_manager  (AdminTuningDesk)| Mot de passe: BoManager123!');

    // ------------------------------------------------------------------
    // ÉTAPE 4 : Création des agents RH (Personnel - 10 fiches)
    // ------------------------------------------------------------------
    console.log('\n👔 ÉTAPE 4 : Création des agents RH (Personnel)...');
    const personnelSeeds = [
      {
        nom: 'Ben Salah',
        prenom: 'Mohamed',
        cin: '08123451',
        poste: 'Responsable Recrutement et Gestion Carrières',
        activeDepartment: depRH._id,
        telephone: '+216 71 100 201',
        emailPersonnel: 'mohamed.bensalah@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2021-03-15')
      },
      {
        nom: 'Trabelsi',
        prenom: 'Amira',
        cin: '08123452',
        poste: 'Chargée de la Formation Continue',
        activeDepartment: depRH._id,
        telephone: '+216 71 100 202',
        emailPersonnel: 'amira.trabelsi@admin.tn',
        sexe: 'Femme',
        dateEmbauche: new Date('2022-01-10')
      },
      {
        nom: 'Gharbi',
        prenom: 'Yassine',
        cin: '08123453',
        poste: 'Gestionnaire Paie & Assurances',
        activeDepartment: depRH._id,
        telephone: '+216 71 100 203',
        emailPersonnel: 'yassine.gharbi@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2020-09-01')
      },
      {
        nom: 'Mejri',
        prenom: 'Leila',
        cin: '08123454',
        poste: 'Agent d\'Enregistrement Courrier Arrivée',
        activeDepartment: depBO._id,
        telephone: '+216 71 100 301',
        emailPersonnel: 'leila.mejri@admin.tn',
        sexe: 'Femme',
        dateEmbauche: new Date('2019-11-20')
      },
      {
        nom: 'Baccouche',
        prenom: 'Karim',
        cin: '08123455',
        poste: 'Agent d\'Expédition et Numérisation',
        activeDepartment: depBO._id,
        telephone: '+216 71 100 302',
        emailPersonnel: 'karim.baccouche@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2023-04-05')
      },
      {
        nom: 'Ayari',
        prenom: 'Sami',
        cin: '08123456',
        poste: 'Ingénieur Systèmes & Sécurité Réseau',
        activeDepartment: depIT._id,
        telephone: '+216 71 100 401',
        emailPersonnel: 'sami.ayari@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2021-06-18')
      },
      {
        nom: 'Mansour',
        prenom: 'Nour',
        cin: '08123457',
        poste: 'Développeuse Fullstack & Base de Données',
        activeDepartment: depIT._id,
        telephone: '+216 71 100 402',
        emailPersonnel: 'nour.mansour@admin.tn',
        sexe: 'Femme',
        dateEmbauche: new Date('2022-08-22')
      },
      {
        nom: 'Kefi',
        prenom: 'Houssem',
        cin: '08123458',
        poste: 'Administrateur Serveurs & Sauvegardes',
        activeDepartment: depIT._id,
        telephone: '+216 71 100 403',
        emailPersonnel: 'houssem.kefi@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2023-02-14')
      },
      {
        nom: 'Chérif',
        prenom: 'Sarra',
        cin: '08123459',
        poste: 'Assistante de Direction & Protocole',
        activeDepartment: depDirection._id,
        telephone: '+216 71 100 102',
        emailPersonnel: 'sarra.cherif@admin.tn',
        sexe: 'Femme',
        dateEmbauche: new Date('2018-05-02')
      },
      {
        nom: 'Dridi',
        prenom: 'Tarek',
        cin: '08123460',
        poste: 'Contrôleur de Gestion & Audit Qualité',
        activeDepartment: depDirection._id,
        telephone: '+216 71 100 103',
        emailPersonnel: 'tarek.dridi@admin.tn',
        sexe: 'Homme',
        dateEmbauche: new Date('2020-10-12')
      }
    ];

    const createdPersonnelList = [];
    for (const pData of personnelSeeds) {
      const p = new Personnel({
        ...pData,
        statut: 'actif',
        departments: [pData.activeDepartment],
        createdBy: userAdmin._id
      });
      await p.save();
      createdPersonnelList.push(p);
    }
    console.log(`✅ 10 agents RH créés avec succès.`);

    // ------------------------------------------------------------------
    // ÉTAPE 5 & 6 : Génération des courriers multi-années (2024, 2025, 2026)
    // Sauvegarde unitaire via await doc.save() avec délai 500ms pour l'IA RAG
    // ------------------------------------------------------------------
    console.log('\n📬 ÉTAPE 5 & 6 : Génération des courriers avec auto-indexation RAG...');
    const years = [2024, 2025, 2026];
    const summary = {
      incomingCountByYear: {},
      outgoingCountByYear: {},
      totalIncoming: 0,
      totalOutgoing: 0
    };

    const targetDepartments = [
      { id: depRH._id, name: depRH.name },
      { id: depBO._id, name: depBO.name },
      { id: depIT._id, name: depIT.name }
    ];

    // Sujets et contenus OCR réalistes pour alimenter la recherche sémantique RAG
    const incomingTemplates = [
      {
        subjectPrefix: 'Rapport annuel d\'activité et bilan de performance',
        ocrPrefix: 'Rapport d\'évaluation générale de performance administrative et financière. Ce document récapitule les indicateurs clés de gouvernance, l\'exécution budgétaire et le suivi des missions prioritaires.'
      },
      {
        subjectPrefix: 'Demande d\'allocation de budget prévisionnel d\'investissement',
        ocrPrefix: 'Demande officielle relative aux crédits budgétaires d\'investissement. Le dossier comprend les fiches financières prévisionnelles, le plan d\'amortissement et l\'argumentaire technique pour les nouveaux équipements.'
      },
      {
        subjectPrefix: 'Plan de formation continue et mise à niveau des compétences',
        ocrPrefix: 'Programme de formation professionnelle pour les cadres administratifs et techniques. Modules ciblés : cybersécurité, gestion documentaire numérique, management agile et droit administratif appliqué.'
      },
      {
        subjectPrefix: 'Audit de sécurité des systèmes d\'information et conformité RGPD',
        ocrPrefix: 'Rapport d\'audit d\'infrastructure informatique, tests d\'intrusion externes et politique de sauvegarde des données. Recommandations prioritaires pour la protection des données sensibles et le chiffrement.'
      },
      {
        subjectPrefix: 'Convention de partenariat inter-institutionnel et coopération',
        ocrPrefix: 'Accord de partenariat stratégique pour le partage de données et l\'harmonisation des procédures entre départements ministériels. Modalités d\'accès aux services interopérables et calendrier d\'exécution.'
      },
      {
        subjectPrefix: 'Cahier des charges pour l\'acquisition d\'équipements bureautiques',
        ocrPrefix: 'Dossier d\'appel d\'offres pour le renouvellement du parc matériel : scanners réseau haute résolution, postes de travail sécurisés, commutateurs réseau et serveurs de stockage NAS.'
      },
      {
        subjectPrefix: 'Note d\'information sur le régime des congés et autorisations d\'absence',
        ocrPrefix: 'Circulaire administrative relative au calendrier annuel des congés payés, aux modalités de demande d\'absence exceptionnelle et au suivi des états de présence informatisés.'
      },
      {
        subjectPrefix: 'Demande de validation des tableaux d\'avancement de grade',
        ocrPrefix: 'Proposition d\'avancement à l\'ancienneté et au mérite pour le personnel titulaire. Liste des candidats éligibles, rapports d\'évaluation des supérieurs hiérarchiques et avis des commissions paritaires.'
      },
      {
        subjectPrefix: 'Protocole sanitaire et mesures de sécurité au travail',
        ocrPrefix: 'Mise à jour du protocole de prévention des risques professionnels, entretien des locaux, ergonomie des postes de travail informatisés et consignes d\'évacuation en cas d\'urgence.'
      },
      {
        subjectPrefix: 'Requête pour l\'extension de la bande passante et interconnexion fibre',
        ocrPrefix: 'Étude technique de raccordement haut débit pour fluidifier les téléprocédures, l\'accès au portail de messagerie électronique interne et la réplication distante des sauvegardes.'
      }
    ];

    const outgoingTemplates = [
      {
        subjectPrefix: 'Réponse à la demande budgétaire et notification d\'accord',
        assignedToDest: 'Ministère des Finances - Direction du Budget',
        ocrPrefix: 'Notification officielle faisant suite à votre requête. Nous vous confirmons l\'approbation des ouvertures de crédits conformément au plan d\'exécution budgétaire validé.'
      },
      {
        subjectPrefix: 'Transmission du rapport d\'activité et synthèse générale',
        assignedToDest: 'Cabinet du Secrétaire Général',
        ocrPrefix: 'Nous vous prions de trouver ci-joint le rapport consolidé pour la période écoulée, incluant le bilan d\'étape et les préconisations pour le prochain exercice administratif.'
      },
      {
        subjectPrefix: 'Approbation du plan de formation et calendrier d\'exécution',
        assignedToDest: 'Centre National de Formation des Cadres',
        ocrPrefix: 'Faisant suite à l\'évaluation des besoins, nous validons le programme de formation proposé ainsi que les dates de sessions pour les agents des services déconcentrés.'
      },
      {
        subjectPrefix: 'Attestation de conformité informatique et validation de recette',
        assignedToDest: 'Direction Générale de la Transformation Numérique',
        ocrPrefix: 'Procès-verbal de réception technique des plateformes logicielles déployées. Les tests de charge et d\'audit de vulnérabilité ont été validés sans réserve bloquante.'
      },
      {
        subjectPrefix: 'Notification officielle d\'affectation et mutation administrative',
        assignedToDest: 'Services Déconcentrés Régionaux',
        ocrPrefix: 'Arrêté officiel portant nomination et affectation de personnel dans les structures régionales. Prise de fonction effective à la date de signature de la présente décision.'
      }
    ];

    for (const year of years) {
      console.log(`\n📅 Traitement de l'année ${year}...`);
      summary.incomingCountByYear[year] = 0;
      summary.outgoingCountByYear[year] = 0;

      const createdIncomingForYear = [];

      // 1. 10 Courriers Entrants pour l'année
      for (let i = 1; i <= 10; i++) {
        const template = incomingTemplates[i - 1];
        // Date étalée dans l'année (ex: mois 1 à 12)
        const month = (i - 1) % 12;
        const day = 10 + (i % 15);
        const arrivalDate = new Date(year, month, day, 9, 30, 0);
        const correspondenceDate = new Date(year, month, day - 3, 10, 0, 0);

        const assignedDept = targetDepartments[(i - 1) % targetDepartments.length];
        const seqNumberStr = String(i).padStart(3, '0');

        const incomingDoc = new IncomingDocument({
          serialNumber: i,
          year: year,
          arrivalDate: arrivalDate,
          correspondenceNumber: `REF-${year}-${seqNumberStr}`,
          correspondenceDate: correspondenceDate,
          typeDocument: i % 2 === 0 ? 'Lettre Officielle' : 'Rapport Technique',
          source: i % 2 === 0 ? 'Ministère de Tutelle' : 'Organisme Partenaire Public',
          subject: `${template.subjectPrefix} [${year}] - Réf. ${seqNumberStr}`,
          ocrText: `${template.ocrPrefix} Réf interne: REF-${year}-${seqNumberStr}. Date de traitement: ${arrivalDate.toISOString().slice(0, 10)}. Année comptable: ${year}.`,
          assignedTo: [assignedDept],
          createdBy: userBO._id,
          isDeleted: false
        });

        // await doc.save() pour déclencher le post('save') hook RAG
        await incomingDoc.save();
        createdIncomingForYear.push(incomingDoc);
        summary.incomingCountByYear[year]++;
        summary.totalIncoming++;

        console.log(`   [${year}] 📥 Courrier Entrant #${i}/10 créé : "REF-${year}-${seqNumberStr}" (Attente 500ms RAG)...`);
        await sleep(500);
      }

      // 2. 5 Courriers Sortants pour l'année
      for (let j = 1; j <= 5; j++) {
        const outTemplate = outgoingTemplates[j - 1];
        const outMonth = (j * 2) % 12;
        const outDay = 5 + (j * 3);
        const issueDate = new Date(year, outMonth, outDay, 14, 0, 0);
        const outSeqStr = String(j).padStart(3, '0');

        // Lier optionnellement le courrier sortant à un courrier entrant de la même année
        const linkedIncoming = createdIncomingForYear[j - 1] ? createdIncomingForYear[j - 1]._id : null;

        const outgoingDoc = new OutgoingDocument({
          serialNumber: j,
          year: year,
          issueDate: issueDate,
          typeDocument: 'Décision / Réponse',
          source: {
            id: depBO._id,
            name: depBO.name
          },
          assignedTo: [outTemplate.assignedToDest],
          pourInfo: ['Direction Générale', 'Archives Centrales'],
          subject: `${outTemplate.subjectPrefix} [${year}] - N° ${outSeqStr}`,
          ocrText: `${outTemplate.ocrPrefix} Référence d'enregistrement sortant: SORTIE-${year}-${outSeqStr}. Date d'émission: ${issueDate.toISOString().slice(0, 10)}. Liasse officielle ${year}.`,
          reference: linkedIncoming,
          createdBy: userBO._id,
          isDeleted: false
        });

        // await doc.save() pour déclencher le post('save') hook RAG
        await outgoingDoc.save();

        // Si lié à un courrier entrant, mettre à jour le champ answer du document entrant
        if (linkedIncoming) {
          await IncomingDocument.updateOne(
            { _id: linkedIncoming },
            { $set: { answer: outgoingDoc._id } }
          );
        }

        summary.outgoingCountByYear[year]++;
        summary.totalOutgoing++;

        console.log(`   [${year}] 📤 Courrier Sortant #${j}/5 créé : "SORTIE-${year}-${outSeqStr}" (Attente 500ms RAG)...`);
        await sleep(500);
      }
    }

    // ------------------------------------------------------------------
    // ÉTAPE 7 : Affichage du récapitulatif complet
    // ------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('✨ RÉCAPITULATIF COMPLET DU SEEDING MULTI-ANNÉES');
    console.log('======================================================================');
    console.log('🔑 COMPTES UTILISATEURS CRÉÉS :');
    console.log('   1. Administrateur Global : admin      / Admin123!     (Rôle: Admin)');
    console.log('   2. Directeur Général     : director   / Director123!  (Rôle: Director)');
    console.log('   3. Responsable RH        : rh_manager / RhManager123! (Rôle: AdminDepartment - RH)');
    console.log('   4. Responsable BO        : bo_manager / BoManager123! (Rôle: AdminTuningDesk - BO)');
    console.log('----------------------------------------------------------------------');
    console.log('🏢 DÉPARTEMENTS : 4 (Direction, RH, BO, IT)');
    console.log(`👔 AGENTS RH (Personnel) : ${createdPersonnelList.length} fiches actives`);
    console.log('----------------------------------------------------------------------');
    console.log('📬 COURRIERS GÉNÉRÉS PAR ANNÉE :');
    for (const yr of years) {
      console.log(`   • Année ${yr} : ${summary.incomingCountByYear[yr]} Entrants | ${summary.outgoingCountByYear[yr]} Sortants (Total: ${summary.incomingCountByYear[yr] + summary.outgoingCountByYear[yr]})`);
    }
    console.log(`   ► TOTAL ENTRANTS : ${summary.totalIncoming}`);
    console.log(`   ► TOTAL SORTANTS : ${summary.totalOutgoing}`);
    console.log(`   ► TOTAL COURRIERS : ${summary.totalIncoming + summary.totalOutgoing}`);
    console.log('======================================================================');
    console.log('🎉 Seeding terminé avec succès et indexation RAG enclenchée.\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR FATALE LORS DU SEEDING :', error);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  seedDatabaseMultiYear();
}

module.exports = seedDatabaseMultiYear;
