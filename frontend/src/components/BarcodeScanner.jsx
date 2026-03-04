import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { XCircle, Camera } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
    const scannerRef = useRef(null);
    const html5QrcodeRef = useRef(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader");
                html5QrcodeRef.current = html5QrCode;

                const config = {
                    fps: 15,
                    // Larger, wider box for standard barcodes
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const width = viewfinderWidth * 0.8;
                        const height = viewfinderHeight * 0.4;
                        return { width, height };
                    },
                    aspectRatio: 1.777778, // 16:9 for most laptop cameras
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.QR_CODE
                    ],
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Ignore minor errors
                    }
                );
            } catch (err) {
                console.error("Camera error:", err);
                // Fallback to simpler config if high-res or wide aspect ratio fails
                try {
                    await html5QrcodeRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt) => { onScan(txt); stopScanner(); });
                } catch (e) {
                    alert("Could not access camera. Please check permissions and lighting.");
                }
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
            try {
                await html5QrcodeRef.current.stop();
                html5QrcodeRef.current.clear();
            } catch (err) {
                console.error("Stop error:", err);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-pop-in">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Camera size={18} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Camera Scanner</h3>
                            <p className="text-[10px] font-bold text-slate-400">Align barcode within the box</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="relative aspect-square sm:aspect-video bg-slate-900">
                    <div id="reader" className="w-full h-full"></div>

                    {/* Decorative Scanner Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[80%] h-[40%] border-2 border-primary/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            <div className="absolute inset-0 border-2 border-primary animate-pulse rounded-lg"></div>
                            {/* Scanning line animation */}
                            <div className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_10px_#2563eb] animate-scan-line"></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 text-center">
                    <p className="text-xs text-slate-500 font-bold">
                        💡 Tip: Hold the barcode about 15-20cm away from the camera. Ensure there is no glare on the label.
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-4 w-full py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all text-sm uppercase"
                    >
                        Abort Scan
                    </button>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                @keyframes scan-line {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
            `}} />
            </div>
        </div>
    );
};

export default BarcodeScanner;
