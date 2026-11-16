const fs = require('fs');
const path = require('path');
const {
  getPowershellPath,
  runCommand,
  CommandTimeoutError,
  CommandAbortedError,
} = require('../commandRunner');
const {
  isValidDeviceIdForPlatform,
  validateResolution,
  validateColorMode,
  validateDocumentSource,
  validateFormat,
  ScannerError,
} = require('../validation');

const WIA_COLOR_INTENT = {
  Color: 1,
  Grayscale: 2,
  BlackAndWhite: 4,
};

const WIA_HANDLING_SELECT = {
  Feeder: 1,
  Flatbed: 2,
};

// Static parameterized WIA PowerShell script: zero string interpolation of user inputs
const WIA_SCAN_SCRIPT_CONTENT = `param(
  [Parameter(Mandatory=$true)][string]$DeviceId,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [Parameter(Mandatory=$true)][int]$Resolution,
  [Parameter(Mandatory=$true)][int]$ColorIntent,
  [Parameter(Mandatory=$true)][int]$HandlingSelect,
  [Parameter(Mandatory=$true)][string]$Format
)

$ErrorActionPreference = 'Stop'

try {
  $deviceManager = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop
  $device = $null
  foreach ($dev in $deviceManager.DeviceInfos) {
    if ($dev.DeviceID -eq $DeviceId) {
      $device = $dev.Connect()
      break
    }
  }

  if ($null -eq $device) {
    Write-Error "SCANNER_NOT_FOUND"
    exit 2
  }

  # WIA_DPS_DOCUMENT_HANDLING_SELECT (3088): 1 = Feeder, 2 = Flatbed
  try {
    $device.Properties("3088").Value = [int]$HandlingSelect
  } catch {
    # Ignore if device does not expose 3088
  }

  $item = $device.Items[1]
  # WIA_IPS_CUR_INTENT (6146), WIA_IPS_XRES (6147), WIA_IPS_YRES (6148) as integers
  try { $item.Properties("6146").Value = [int]$ColorIntent } catch {}
  try { $item.Properties("6147").Value = [int]$Resolution } catch {}
  try { $item.Properties("6148").Value = [int]$Resolution } catch {}

  $pngGuid = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"
  $jpgGuid = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
  $transferGuid = if ($Format -eq 'jpg') { $jpgGuid } else { $pngGuid }
  $ext = if ($Format -eq 'jpg') { 'jpg' } else { 'png' }

  $pageIndex = 0
  $isFeeder = ($HandlingSelect -eq 1)

  while ($true) {
    if ($isFeeder -and $pageIndex -gt 0) {
      try {
        $status = [int]$device.Properties("3087").Value
        if (($status -band 1) -eq 0) {
          break
        }
      } catch {
        break
      }
    }

    try {
      $img = $item.Transfer($transferGuid)
    } catch {
      $msg = $_.Exception.Message
      if ($msg -match '0x80210003|PAPER_EMPTY|NO_PAPER') {
        if ($pageIndex -gt 0) { break }
        Write-Error "SCANNER_NO_PAPER"
        exit 3
      }
      throw
    }

    $pageIndex++
    $outFile = Join-Path $OutputDir ("page_{0}.{1}" -f $pageIndex, $ext)
    $img.SaveFile($outFile)
    Write-Output ("PAGE:{0}" -f $pageIndex)
    [Console]::Out.Flush()

    if (-not $isFeeder) {
      break
    }
  }

  if ($pageIndex -eq 0) {
    Write-Error "SCANNER_NO_PAPER"
    exit 3
  }

  exit 0
} catch {
  $errMsg = $_.Exception.Message
  if ($errMsg -match '0x80210003|PAPER_EMPTY|NO_PAPER') {
    Write-Error "SCANNER_NO_PAPER"
    exit 3
  }
  if ($errMsg -match '0x80210006|BUSY|SCANNER_BUSY') {
    Write-Error "SCANNER_BUSY"
    exit 4
  }
  Write-Error $errMsg
  exit 1
}
`;

const WIA_TEST_SCRIPT_CONTENT = `param(
  [Parameter(Mandatory=$true)][string]$DeviceId
)
try {
  $dm = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop
  $device = $null
  foreach ($dev in $dm.DeviceInfos) {
    if ($dev.DeviceID -eq $DeviceId) {
      $device = $dev.Connect()
      break
    }
  }
  if ($null -eq $device) {
    Write-Error "SCANNER_NOT_FOUND"
    exit 2
  }
  Write-Output "SCANNER_OK"
  exit 0
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`;

function mapCommandFailureToScannerError(error) {
  if (error instanceof ScannerError) return error;
  if (error instanceof CommandTimeoutError) {
    return new ScannerError('SCAN_TIMEOUT', 'Délai de numérisation dépassé (timeout).', 504);
  }
  if (error instanceof CommandAbortedError) {
    return new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
  }

  const combined = `${error.stderr || ''}\n${error.stdout || ''}\n${error.message || ''}`;
  if (/SCANNER_NO_PAPER|PAPER_EMPTY|0x80210003|no paper/i.test(combined)) {
    return new ScannerError('SCANNER_NO_PAPER', 'Aucun papier détecté dans le scanner.', 409);
  }
  if (/SCANNER_BUSY|0x80210006|busy/i.test(combined)) {
    return new ScannerError('SCANNER_BUSY', 'Le scanner est actuellement occupé.', 503);
  }
  if (/SCANNER_NOT_FOUND|not found/i.test(combined) || error.exitCode === 2) {
    return new ScannerError('SCANNER_NOT_FOUND', 'Scanner introuvable ou déconnecté.', 503);
  }

  return new ScannerError('SCAN_FAILED', 'Échec matériel lors de la numérisation.', 500);
}

/**
 * Executes Windows WIA PowerShell scanning safely via parameterized script and commandRunner.
 */
class ScanExecutor {
  static async executeScan({
    scannerDevice,
    jobTempDir,
    resolution,
    format,
    colorMode = 'Color',
    documentSource = 'Flatbed',
    timeoutMs = 120000,
    signal = null,
    onPage = null,
  }) {
    if (!isValidDeviceIdForPlatform(scannerDevice, 'win32')) {
      throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant de scanner Windows invalide.', 400);
    }

    const safeResolution = validateResolution(resolution);
    const safeFormat = validateFormat(format);
    const safeColor = validateColorMode(colorMode);
    const safeSource = validateDocumentSource(documentSource);
    const colorIntent = WIA_COLOR_INTENT[safeColor];
    const handlingSelect = WIA_HANDLING_SELECT[safeSource];

    fs.mkdirSync(jobTempDir, { recursive: true });
    const psScriptPath = path.join(jobTempDir, 'wia_scan.ps1');
    fs.writeFileSync(psScriptPath, WIA_SCAN_SCRIPT_CONTENT, 'utf8');

    const psPath = getPowershellPath();
    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      psScriptPath,
      '-DeviceId',
      scannerDevice,
      '-OutputDir',
      jobTempDir,
      '-Resolution',
      String(safeResolution),
      '-ColorIntent',
      String(colorIntent),
      '-HandlingSelect',
      String(handlingSelect),
      '-Format',
      safeFormat === 'jpg' ? 'jpg' : 'png',
    ];

    try {
      await runCommand(psPath, args, {
        timeoutMs,
        signal,
        onStdoutLine: (line) => {
          const match = line.trim().match(/^PAGE:(\d+)$/);
          if (match && typeof onPage === 'function') {
            onPage(Number(match[1]));
          }
        },
      });
    } catch (err) {
      console.error('[Scanner][Windows] Scan failed:', err.stderr || err.message);
      throw mapCommandFailureToScannerError(err);
    } finally {
      if (fs.existsSync(psScriptPath)) {
        try { fs.unlinkSync(psScriptPath); } catch (_) {}
      }
    }

    const files = fs
      .readdirSync(jobTempDir)
      .filter((f) => /^page_\d+\.(png|jpg|jpeg|bmp)$/i.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0], 10);
        const nb = parseInt(b.match(/\d+/)[0], 10);
        return na - nb;
      })
      .map((f) => path.join(jobTempDir, f));

    if (files.length === 0) {
      throw new ScannerError('SCAN_FAILED', 'Aucune page produite par le scanner.', 500);
    }

    return { pageFiles: files };
  }

  static async testScannerConnection(scannerDevice) {
    if (!isValidDeviceIdForPlatform(scannerDevice, 'win32')) {
      return false;
    }

    const os = require('os');
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-wia-test-'));
    const scriptPath = path.join(testDir, 'wia_test.ps1');

    try {
      fs.writeFileSync(scriptPath, WIA_TEST_SCRIPT_CONTENT, 'utf8');
      await runCommand(
        getPowershellPath(),
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          scriptPath,
          '-DeviceId',
          scannerDevice,
        ],
        { timeoutMs: 10000 }
      );
      return true;
    } catch (error) {
      console.error('[Scanner][Windows] Connection test failed:', error.stderr || error.message);
      return false;
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

module.exports = ScanExecutor;
