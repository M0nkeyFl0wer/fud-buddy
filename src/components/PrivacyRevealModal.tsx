import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Eye, MapPin, Clock, Smartphone, Trash2, ExternalLink } from 'lucide-react';
import { privacyTrackingService, TrackedData } from '@/services/privacyTrackingService';

interface PrivacyRevealModalProps {
  open: boolean;
  onClose: () => void;
}

const PrivacyRevealModal: React.FC<PrivacyRevealModalProps> = ({ open, onClose }) => {
  const trackedData = privacyTrackingService.getTrackedData();
  const insights = privacyTrackingService.generateInsights();

  const handleDeleteData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      privacyTrackingService.deleteAllData();
      alert('All your data has been deleted!');
      onClose();
    }
  };

  const handleClose = () => {
    privacyTrackingService.markRevealAsSeen();
    onClose();
  };

  if (!trackedData) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Eye className="text-red-500" />
            We Know A Bit Too Much About You
          </DialogTitle>
          <DialogDescription className="text-base">
            This is what FUD Buddy has collected about you. Most food apps collect even more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Insights Section */}
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle size={20} />
                What We've Learned About You
              </h3>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-red-500">▸</span>
                    <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Device Fingerprint */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Smartphone size={20} />
              Your Device Fingerprint
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-xs font-mono space-y-1">
              <div><span className="text-gray-500">Browser:</span> {trackedData.deviceFingerprint.userAgent}</div>
              <div><span className="text-gray-500">Screen:</span> {trackedData.deviceFingerprint.screenResolution}</div>
              <div><span className="text-gray-500">Platform:</span> {trackedData.deviceFingerprint.platform}</div>
              <div><span className="text-gray-500">Timezone:</span> {trackedData.deviceFingerprint.timezone}</div>
              <div><span className="text-gray-500">Languages:</span> {trackedData.deviceFingerprint.languages.join(', ')}</div>
              <div><span className="text-gray-500">Touch Support:</span> {trackedData.deviceFingerprint.touchSupport ? 'Yes' : 'No'}</div>
              {trackedData.deviceFingerprint.hardwareConcurrency && (
                <div><span className="text-gray-500">CPU Cores:</span> {trackedData.deviceFingerprint.hardwareConcurrency}</div>
              )}
            </div>
          </div>

          {/* Location History */}
          {trackedData.locationHistory.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <MapPin size={20} />
                Where You've Searched
              </h3>
              <div className="space-y-2">
                {trackedData.locationHistory.slice(-5).reverse().map((location, index) => (
                  <div key={index} className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    📍 {location.city || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    {location.accuracy && (
                      <span className="text-gray-500 ml-2">(±{Math.round(location.accuracy)}m accuracy)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Timeline */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Clock size={20} />
              Your Activity Timeline
            </h3>
            <div className="space-y-1 text-xs max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded">
              {trackedData.usageHistory.slice(-10).reverse().map((usage, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-gray-500">
                    {new Date(usage.timestamp).toLocaleString()}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span>{usage.action}</span>
                  {usage.timeOfDay && (
                    <span className="text-gray-500">({usage.timeOfDay})</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Educational Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-blue-700 dark:text-blue-400">
              Why Are We Showing You This?
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              FUD Buddy is designed to help you understand how much data apps collect about you.
              Real food delivery apps, social media, and other services collect <strong>even more</strong> -
              often without your knowledge.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              They track your location constantly, build psychological profiles, sell your data to advertisers,
              and use it to manipulate your decisions. FUD Buddy shows you what's possible with just a few searches.
            </p>

            <h4 className="font-semibold mb-2 text-sm">Protect Your Privacy:</h4>
            <div className="space-y-2">
              <a
                href="https://www.eff.org/issues/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={14} />
                EFF's Privacy Resources
              </a>
              <a
                href="https://ssd.eff.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={14} />
                Surveillance Self-Defense Guide
              </a>
              <a
                href="https://privacybadger.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={14} />
                Privacy Badger (Browser Extension)
              </a>
              <a
                href="https://coveryourtracks.eff.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={14} />
                Cover Your Tracks (Test Your Browser)
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleDeleteData}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete All My Data
            </Button>
            <Button onClick={handleClose} variant="outline" className="flex-1">
              I Understand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyRevealModal;
