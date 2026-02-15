import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { features } from '@/services/features';
import { requestOsintExpandOnce, saveUserProfile, type UserProfile } from '@/services/profile';

type SaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (profile: UserProfile) => void;
};

export function SaveDialog({ open, onOpenChange, onSaved }: SaveDialogProps) {
  const [name, setName] = useState('');
  const [allowProfile, setAllowProfile] = useState(true);
  const [showInOsint, setShowInOsint] = useState(true);

  const canDevSave = features.enableLocalSaveFallback;

  const payload = useMemo<UserProfile>(() => {
    return {
      provider: 'none',
      displayName: name.trim() || undefined,
      avatarUrl: undefined,
      consentSaveHistory: false,
      consentShowInOsint: showInOsint,
    };
  }, [name, showInOsint]);

  const handleDevSave = () => {
    // Dev-only: store locally so we can test the full UX without OAuth.
    const profile: UserProfile = {
      ...payload,
      provider: 'local',
      consentSaveHistory: true,
      consentShowInOsint: showInOsint,
    };
    saveUserProfile(profile);
    if (showInOsint) requestOsintExpandOnce();
    onSaved?.(profile);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save</DialogTitle>
          <DialogDescription>
            Saving history and personalizing the “What we know about you” section requires connecting an account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Connect</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled>
                Connect Instagram
              </Button>
              <Button type="button" variant="outline" disabled>
                Connect Facebook
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">OAuth flow coming next.</div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox checked={allowProfile} onCheckedChange={(v) => setAllowProfile(Boolean(v))} />
            <div className="leading-tight">
              <div className="text-sm font-medium">Allow profile photo + name</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox checked={showInOsint} onCheckedChange={(v) => setShowInOsint(Boolean(v))} />
            <div className="leading-tight">
              <div className="text-sm font-medium">Show in “What we know about you”</div>
            </div>
          </div>

          {(allowProfile || showInOsint) ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
            </div>
          ) : null}

          {canDevSave ? (
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium">Dev fallback</div>
              <div className="text-xs text-muted-foreground mt-1">
                For testing only: save locally without OAuth.
              </div>
              <div className="mt-3">
                <Button type="button" onClick={handleDevSave}>Save locally (dev)</Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
