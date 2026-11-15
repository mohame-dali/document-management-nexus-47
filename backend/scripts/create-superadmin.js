#!/usr/bin/env node
/**
 * backend/scripts/create-superadmin.js
 * Script interactif sécurisé de création du premier compte administrateur.
 * Note : Le rôle 'SuperAdmin' n'existe pas dans backend/models/User.js:25
 * (enum : 'Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User').
 * Ce script crée donc le rôle administrateur le plus élevé existant : 'Admin'.
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const readline = require('readline');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const User = require('../models/User');

const ADMIN_ROLE = 'Admin';
const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function promptText(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptMasked(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      return reject(
        new Error('Saisie masquée impossible : le terminal courant n\'est pas interactif (TTY requis).')
      );
    }

    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = Boolean(stdin.isRaw);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\u0003') {
          // Ctrl+C
          cleanup();
          process.stdout.write('\n');
          reject(new Error('Opération annulée par l\'utilisateur.'));
          return;
        }
        if (ch === '\r' || ch === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u007f' || ch === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
          }
          continue;
        }
        value += ch;
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('❌ ERREUR : Variable MONGODB_URI absente de l\'environnement.');
    process.exit(1);
  }

  let connected = false;
  try {
    const isLocalOrStandalone = !dbUri.includes('+srv') && !dbUri.includes('replicaSet');
    await mongoose.connect(dbUri, {
      ...(isLocalOrStandalone ? { directConnection: true } : {}),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    connected = true;

    const existingAdmin = await User.findOne({
      role: ADMIN_ROLE,
      isDeleted: { $ne: true },
    });

    if (existingAdmin) {
      console.error(
        `❌ Refus : un compte administrateur (${ADMIN_ROLE}) actif/existant est déjà enregistré en base.`
      );
      process.exitCode = 1;
      return;
    }

    console.log(`ℹ️ Rôle utilisé : '${ADMIN_ROLE}' (rôle administrateur le plus élevé défini dans User.js).`);

    const rawUsername = await promptText('Nom d\'utilisateur administrateur : ');
    const username = rawUsername.trim();
    if (!username || username.length < 3 || username.length > 100) {
      console.error('❌ Nom d\'utilisateur invalide (3 à 100 caractères requis).');
      process.exitCode = 1;
      return;
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.error('❌ Ce nom d\'utilisateur est déjà utilisé.');
      process.exitCode = 1;
      return;
    }

    const password = await promptMasked('Mot de passe (>= 12 caractères, majuscule, minuscule, chiffre) : ');
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`❌ Mot de passe refusé : minimum ${MIN_PASSWORD_LENGTH} caractères requis.`);
      process.exitCode = 1;
      return;
    }
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      console.error('❌ Mot de passe refusé : doit contenir au moins une minuscule, une majuscule et un chiffre.');
      process.exitCode = 1;
      return;
    }

    const confirmPassword = await promptMasked('Confirmer le mot de passe : ');
    if (password !== confirmPassword) {
      console.error('❌ Les deux mots de passe ne correspondent pas.');
      process.exitCode = 1;
      return;
    }

    await User.create({
      username,
      password,
      role: ADMIN_ROLE,
      isActive: true,
      mustChangePassword: false,
    });

    console.log(`✅ Compte '${ADMIN_ROLE}' créé avec succès pour l'utilisateur '${username}'.`);
  } catch (err) {
    console.error('❌ Échec de création du compte administrateur :', err.message);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.connection.close();
    }
  }
}

main();
