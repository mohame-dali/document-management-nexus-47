const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const SemanticIndex = require('../models/SemanticIndex');

async function testRbac() {
  const dbUri = process.env.MONGODB_URI || 
    'mongodb://localhost:27017/document-management';
  
  await mongoose.connect(dbUri);
  console.log('✅ MongoDB connecté\n');

  // Liste des départements distincts
  const depts = await SemanticIndex.distinct('metadata.departmentId');
  const deptsArray = await SemanticIndex.distinct('metadata.departmentIds');
  const allDepts = Array.from(new Set([...depts, ...deptsArray])).filter(Boolean);

  console.log('📋 Départements présents dans l\'index :');
  allDepts.forEach((d) => console.log(`   - ${d}`));

  // Simuler un AdminDepartment
  if (allDepts.length > 0) {
    const testDeptId = allDepts[0];
    const filteredDocs = await SemanticIndex.find({
      $or: [
        { 'metadata.departmentIds': testDeptId },
        { 'metadata.departmentId': testDeptId },
      ],
    });
    console.log(`\n🔒 Test filtrage pour dept ${testDeptId} :`);
    console.log(`   → ${filteredDocs.length} documents accessibles`);
  }

  // Total
  const total = await SemanticIndex.countDocuments();
  console.log(`\n📊 Total dans l'index : ${total}`);

  await mongoose.connection.close();
  process.exit(0);
}

testRbac();
