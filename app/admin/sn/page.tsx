import { Barcode } from 'lucide-react';

export default function SNManager() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 mt-32">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex flex-col items-center justify-center shadow-inner">
                <Barcode size={40} className="text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-600">SN Manager</h2>
            <p className="text-sm">Fitur manajemen Serial Number sedang dalam pengembangan.</p>
        </div>
    );
}
