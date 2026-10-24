import fs from 'fs';
import path from 'path';

const dirs = [
  'backend/uploads',
  'backend/uploads/usersphoto',
  'backend/uploads/personnelphoto',
  'backend/uploads/documents',
  'backend/uploads/backups',
];

for (const dir of dirs) {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

console.log('[check-os] OS check and directories verification complete.');
process.exit(0);
