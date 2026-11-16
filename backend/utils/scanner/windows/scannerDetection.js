const {
  getPowershellPath,
  commandExists,
  runCommand,
  CommandTimeoutError,
} = require('../commandRunner');
const { isValidDeviceIdForPlatform, ScannerError } = require('../validation');

/**
 * Provides scanner detection functionality for Windows via isolated commandRunner (WIA COM).
 */
class ScannerDetection {
  static async detectWIATools() {
    const psPath = getPowershellPath();
    if (!commandExists(psPath)) {
      console.warn(`[Scanner] PowerShell binary not found: ${psPath}`);
      return false;
    }

    const script = [
      'try {',
      '  $wia = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop',
      '  Write-Output "WIA_OK"',
      '  exit 0',
      '} catch {',
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('; ');

    try {
      const { stdout } = await runCommand(
        psPath,
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { timeoutMs: 10000 }
      );
      return stdout.includes('WIA_OK');
    } catch (error) {
      console.warn('[Scanner] WIA availability check failed:', error.message);
      return false;
    }
  }

  static async listScanners() {
    const psPath = getPowershellPath();
    if (!commandExists(psPath)) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Outils de numérisation Windows (PowerShell/WIA) introuvables.',
        503
      );
    }

    const script = [
      'try {',
      '  $dm = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop',
      '  $devices = @()',
      '  foreach ($d in $dm.DeviceInfos) {',
      '    if ($d.Type -eq 1) {',
      '      $devices += [PSCustomObject]@{',
      '        id = $d.DeviceID',
      '        name = $d.Properties("Name").Value',
      '        description = $d.Properties("Description").Value',
      '      }',
      '    }',
      '  }',
      '  if ($devices.Count -eq 0) { Write-Output "[]"; exit 0 }',
      '  Write-Output (ConvertTo-Json -InputObject @($devices) -Compress)',
      '  exit 0',
      '} catch {',
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('; ');

    let result;
    try {
      result = await runCommand(
        psPath,
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { timeoutMs: 15000 }
      );
    } catch (error) {
      if (error instanceof CommandTimeoutError) {
        throw new ScannerError('SCAN_TIMEOUT', 'Délai dépassé lors de la détection WIA.', 504);
      }
      console.error('[Scanner] Windows listScanners error:', error.stderr || error.message);
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Impossible d’interroger les périphériques WIA Windows.',
        503
      );
    }

    const raw = (result.stdout || '').trim();
    if (!raw || raw === '[]' || raw.includes('No scanners found')) {
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[Scanner] Invalid JSON from WIA listScanners:', parseErr.message);
      return [];
    }

    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((d) => d && typeof d.id === 'string' && isValidDeviceIdForPlatform(d.id, 'win32'))
      .map((d) => ({
        id: d.id,
        name: d.name || 'Windows WIA Scanner',
        type: d.description || 'WIA Scanner',
        status: 'available',
      }));
  }

  static async checkScannerExists(deviceId) {
    if (!isValidDeviceIdForPlatform(deviceId, 'win32')) {
      return false;
    }
    const scanners = await this.listScanners();
    return scanners.some((scanner) => scanner.id === deviceId);
  }
}

module.exports = ScannerDetection;
