Param([string]$path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] > $null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] > $null
[Windows.Storage.Streams.RandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime] > $null

#$path = $path -replace '/', '\\'

function Get-OcrText($path) {
    # Convert path to StorageFile then open stream
    $storageFile = [Windows.Storage.StorageFile]::GetFileFromPathAsync($path).GetResults()
    $stream = $storageFile.OpenReadAsync().GetResults()
    $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetResults()
    $bitmap = $decoder.GetSoftwareBitmapAsync().GetResults()
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    $result = $engine.RecognizeAsync($bitmap).GetResults()
    return $result.Text
}

try {
    $text = Get-OcrText $path
    Write-Output $text
} catch {
    Write-Error $_.Exception.Message
    exit 1
}