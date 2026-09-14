const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

/**
 * Install OCR dependencies based on the operating system
 */
async function installOCRDependencies() {
  const platform = os.platform();
  console.log(`Detected operating system: ${platform}`);
  console.log('Installing OCR dependencies...');

  try {
    if (platform === 'win32') {
      console.log('Windows detected. Please install the following manually:');
      console.log('1. Redis: Download from https://github.com/microsoftarchive/redis/releases');
      console.log('2. ImageMagick: Download from https://imagemagick.org/script/download.php');
      console.log('3. Tesseract OCR: Download Windows installer from GitHub releases');
      console.log('4. Poppler utils: Not typically available on Windows, consider using WSL');
      
    } else if (platform === 'linux' || platform === 'darwin') {
      // Linux or macOS
      console.log('Installing dependencies for Linux/macOS...');
      
      try {
        // Update package list
        console.log('Updating package list...');
        await execAsync('sudo apt-get update');
        
        // Install Redis
        console.log('Installing Redis...');
        await execAsync('sudo apt-get install -y redis-server');
        
        // Install ImageMagick
        console.log('Installing ImageMagick...');
        await execAsync('sudo apt-get install -y imagemagick');
        
        // Install Tesseract OCR with language support
        console.log('Installing Tesseract OCR...');
        await execAsync('sudo apt-get install -y tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng');
        
        // Install Poppler utils for PDF to image conversion
        console.log('Installing Poppler utils...');
        await execAsync('sudo apt-get install -y poppler-utils');
        
        console.log('All dependencies installed successfully!');
        console.log('Starting Redis server...');
        await execAsync('sudo systemctl start redis-server');
        await execAsync('sudo systemctl enable redis-server');
        
        console.log('Testing Redis connection...');
        const { stdout: redisTest } = await execAsync('redis-cli ping');
        console.log('Redis test:', redisTest.trim());
        
        console.log('Testing ImageMagick...');
        const { stdout: magickTest } = await execAsync('convert -version');
        console.log('ImageMagick version:', magickTest.split('\n')[0]);
        
        console.log('Testing Tesseract...');
        const { stdout: tesseractTest } = await execAsync('tesseract --version');
        console.log('Tesseract version:', tesseractTest.split('\n')[0]);
        
      } catch (error) {
        console.error('Error installing dependencies:', error.message);
        console.log('You may need to run this script with sudo privileges');
      }
    } else {
      console.log(`Unsupported operating system: ${platform}`);
      console.log('Please install dependencies manually:');
      console.log('- Redis server');
      console.log('- ImageMagick');
      console.log('- Tesseract OCR with Arabic language support');
      console.log('- Poppler utils (for PDF to image conversion)');
    }
  } catch (error) {
    console.error('Failed to install dependencies:', error);
  }
}

/**
 * Check if required dependencies are installed
 */
async function checkDependencies() {
  const platform = os.platform();
  console.log('Checking OCR dependencies...');
  
  const dependencies = {
    redis: false,
    imagemagick: false,
    tesseract: false,
    poppler: false
  };
  
  try {
    // Check Redis
    try {
      await execAsync('redis-cli ping');
      dependencies.redis = true;
      console.log('✓ Redis is installed and running');
    } catch {
      console.log('✗ Redis is not installed or not running');
    }
    
    // Check ImageMagick
    try {
      if (platform === 'win32') {
        await execAsync('magick -version');
      } else {
        await execAsync('convert -version');
      }
      dependencies.imagemagick = true;
      console.log('✓ ImageMagick is installed');
    } catch {
      console.log('✗ ImageMagick is not installed');
    }
    
    // Check Tesseract
    try {
      await execAsync('tesseract --version');
      dependencies.tesseract = true;
      console.log('✓ Tesseract OCR is installed');
      
      // Check language support
      try {
        const { stdout: langs } = await execAsync('tesseract --list-langs');
        const availableLangs = langs.toLowerCase().split('\n').filter(lang => lang.trim() !== '').slice(1);
        console.log('Available languages:', availableLangs.join(', '));
        
        if (availableLangs.includes('ara')) {
          console.log('✓ Arabic language support available');
        } else {
          console.log('✗ Arabic language support not available');
        }
        
        if (availableLangs.includes('fra')) {
          console.log('✓ French language support available');
        }
        
        if (availableLangs.includes('eng')) {
          console.log('✓ English language support available');
        }
      } catch (langError) {
        console.log('Could not check language support:', langError.message);
      }
    } catch {
      console.log('✗ Tesseract OCR is not installed');
    }
    
    // Check Poppler utils (pdftoppm)
    try {
      await execAsync('pdftoppm -v');
      dependencies.poppler = true;
      console.log('✓ Poppler utils are installed');
    } catch {
      console.log('✗ Poppler utils are not installed');
    }
    
    return dependencies;
    
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return dependencies;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--install')) {
    installOCRDependencies();
  } else if (args.includes('--check')) {
    checkDependencies();
  } else {
    console.log('Usage:');
    console.log('  node install-ocr-dependencies.js --install  # Install dependencies');
    console.log('  node install-ocr-dependencies.js --check    # Check installed dependencies');
  }
}

module.exports = {
  installOCRDependencies,
  checkDependencies
};
