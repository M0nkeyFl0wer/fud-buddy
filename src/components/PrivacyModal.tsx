
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy Information</DialogTitle>
          <DialogDescription>
            How we handle your data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          <p className="text-sm">
            FUD Buddy uses pixels to personalize your experience — and to teach you about data privacy.
          </p>
          
          <p className="text-sm">
            When tracking is enabled, we collect basic usage data to improve our recommendations and understand how people use FUD Buddy.
          </p>
          
          <p className="text-sm">
            You can disable tracking at any time using the toggle in the bottom-left corner of the screen.
          </p>
          
          <div className="bg-fud-lightGreen p-3 rounded-md">
            <h4 className="font-medium text-sm">What we track:</h4>
            <ul className="text-xs list-disc list-inside space-y-1 mt-1">
              <li>Basic interaction with the app</li>
              <li>Feature usage (which recommendations you request)</li>
              <li>General location (city-level) when provided</li>
            </ul>
          </div>
          
          <div className="bg-fud-yellow p-3 rounded-md">
            <h4 className="font-medium text-sm">What we DON'T track:</h4>
            <ul className="text-xs list-disc list-inside space-y-1 mt-1">
              <li>Exact locations or GPS coordinates</li>
              <li>Personal information</li>
              <li>Food preferences outside of what you explicitly tell FUD Buddy</li>
            </ul>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            To learn more about data privacy in general, check out resources like 
            <a href="https://www.privacytools.io" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer"> Privacy Tools</a> or 
            <a href="https://www.eff.org/issues/privacy" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer"> EFF's Privacy Resources</a>.
          </p>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyModal;
