import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { saveUserProfile, requestOsintExpandOnce, type UserProfile } from '@/services/profile';

type ShareAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  preview?: {
    restaurantName: string;
    dishName?: string;
  };
  onSaved?: (profile: UserProfile) => void;
};

export function ShareAccountDialog({ open, onOpenChange, defaultName = '', preview, onSaved }: ShareAccountDialogProps) {
  const [saveHistory, setSaveHistory] = useState(true);
  const [showInOsint, setShowInOsint] = useState(true);
  const [name, setName] = useState(defaultName);

  const avatarFallback = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'YOU';
    const first = parts[0]?.[0] || 'Y';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase();
  }, [name]);

  const handleSave = () => {
    const profile: UserProfile = {
      provider: 'local',
      displayName: name.trim() || undefined,
      consentSaveHistory: saveHistory,
      consentShowInOsint: showInOsint,
    };
    saveUserProfile(profile);

    onSaved?.(profile);

    if (showInOsint) {
      requestOsintExpandOnce();
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share + Save</DialogTitle>
          <DialogDescription>
            No friction up front. If you want history and a little “wow / mildly unsettling” moment,
            opt in here.
          </DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={undefined} alt="" />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Tonight's main character</div>
                <div className="text-xs text-muted-foreground truncate">
                  {preview.restaurantName}{preview.dishName ? ` · ${preview.dishName}` : ''}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              If you connect a social account later, we can pull your profile image and generate a cute
              “cartoon card” automatically.
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox checked={saveHistory} onCheckedChange={(v) => setSaveHistory(Boolean(v))} />
            <div className="leading-tight">
              <div className="text-sm font-medium">Save my history on this device</div>
              <div className="text-xs text-muted-foreground">Stores your sessions locally (no account needed).</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox checked={showInOsint} onCheckedChange={(v) => setShowInOsint(Boolean(v))} />
            <div className="leading-tight">
              <div className="text-sm font-medium">Show my name in “What we know about you”</div>
              <div className="text-xs text-muted-foreground">Only with permission. You can delete it anytime.</div>
            </div>
          </div>

          {showInOsint && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Name (optional)</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
              <div className="text-[11px] text-muted-foreground">
                No selfie upload needed. When social sign-in is enabled, we’ll use your profile photo (with permission).
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Sign in (optional)</div>
            <div className="text-xs text-muted-foreground mt-1">
              Instagram/Facebook sign-in will enable cross-device history and profile-photo cartoons.
              Coming next.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled>
                Continue with Instagram
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                Continue with Facebook
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button type="button" onClick={handleSave}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
