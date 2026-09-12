import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'تأكيد', message, confirmText = 'تأكيد', cancelText = 'إلغاء', destructive = false }) {
    const [loading, setLoading] = useState(false);
    const handleConfirm = async () => {
        try {
            setLoading(true);
            await onConfirm();
            onClose();
        } finally {
            setLoading(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">{message}</p>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button>
                    <Button variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm} disabled={loading}>
                        {loading ? 'جارٍ...' : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}