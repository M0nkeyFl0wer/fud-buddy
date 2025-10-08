import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { secureStorageHelpers } from '@/utils/secureStorage';
import { Shield, Cookie, MapPin, Eye, BarChart3 } from 'lucide-react';

interface ConsentOptions {
  essential: boolean;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  location: boolean;
}

const PrivacyConsentModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consentOptions, setConsentOptions] = useState<ConsentOptions>({
    essential: true, // Always required
    analytics: false,
    personalization: false,
    marketing: false,
    location: false
  });

  useEffect(() => {
    // Check if user has already provided consent
    const existingConsent = secureStorageHelpers.getPrivacyConsent();
    
    if (!existingConsent) {
      // Show modal after a brief delay to not interrupt loading
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsentChange = (category: keyof ConsentOptions, checked: boolean) => {
    if (category === 'essential') return; // Can't disable essential
    
    setConsentOptions(prev => ({
      ...prev,
      [category]: checked
    }));
  };

  const handleAcceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      personalization: true,
      marketing: true,
      location: true
    };
    saveConsent(allConsent);
  };

  const handleAcceptSelected = () => {
    saveConsent(consentOptions);
  };

  const handleDeclineAll = () => {
    const minimalConsent = {
      essential: true,
      analytics: false,
      personalization: false,
      marketing: false,
      location: false
    };
    saveConsent(minimalConsent);
  };

  const saveConsent = (consent: ConsentOptions) => {
    const consentData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
      categories: consent,
      userAgent: navigator.userAgent,
      domain: window.location.hostname
    };

    // Store consent securely
    secureStorageHelpers.setPrivacyConsent(consentData);

    // Set global flags to control data collection
    localStorage.setItem('tracking-disabled', consent.analytics ? 'false' : 'true');
    localStorage.setItem('personalization-disabled', consent.personalization ? 'false' : 'true');
    localStorage.setItem('marketing-disabled', consent.marketing ? 'false' : 'true');
    localStorage.setItem('location-disabled', consent.location ? 'false' : 'true');

    console.log('Privacy consent saved:', consentData);
    setShowModal(false);
  };

  const dataCategories = [
    {
      id: 'essential' as const,
      title: 'Essential Cookies',
      description: 'Required for the app to function properly',
      icon: Shield,
      required: true,
      details: [
        'User session management',
        'Security and authentication',
        'Basic app functionality',
        'Error logging for debugging'
      ]
    },
    {
      id: 'analytics' as const,
      title: 'Analytics',
      description: 'Help us understand how you use our app',
      icon: BarChart3,
      required: false,
      details: [
        'Page views and user interactions',
        'Performance monitoring',
        'Usage statistics',
        'Anonymous user behavior patterns'
      ]
    },
    {
      id: 'personalization' as const,
      title: 'Personalization',
      description: 'Customize your food recommendations',
      icon: Cookie,
      required: false,
      details: [
        'Food preferences and dietary restrictions',
        'Restaurant recommendations history',
        'Personalized content',
        'Improved AI responses based on past interactions'
      ]
    },
    {
      id: 'marketing' as const,
      title: 'Marketing',
      description: 'Show relevant food promotions',
      icon: Eye,
      required: false,
      details: [
        'Targeted advertisements',
        'Restaurant promotions',
        'Email marketing (if subscribed)',
        'Social media integration'
      ]
    },
    {
      id: 'location' as const,
      title: 'Location Services',
      description: 'Find restaurants near you',
      icon: MapPin,
      required: false,
      details: [
        'GPS location for nearby restaurants',
        'IP-based location approximation',
        'Location history for better recommendations',
        'Local food trend analysis'
      ]
    }
  ];

  return (
    <Dialog open={showModal} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Notice & Cookie Consent
          </DialogTitle>
          <DialogDescription>
            We care about your privacy. Please review and customize your data preferences below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Your Privacy Rights:</strong> You can withdraw or modify your consent at any time 
              through the Settings page. We will only collect and process data you explicitly agree to.
            </p>
          </div>

          <div className="space-y-3">
            {dataCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center space-x-2 flex-1">
                        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{category.title}</h4>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {category.required && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  Required
                                </span>
                              )}
                              <Checkbox
                                checked={consentOptions[category.id]}
                                onCheckedChange={(checked) => 
                                  handleConsentChange(category.id, checked as boolean)
                                }
                                disabled={category.required}
                              />
                            </div>
                          </div>
                          
                          {showDetails && (
                            <div className="mt-2 pl-4 border-l-2 border-gray-200">
                              <p className="text-xs text-muted-foreground mb-1">This includes:</p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {category.details.map((detail, index) => (
                                  <li key={index} className="flex items-center space-x-1">
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            
            <div className="text-xs text-muted-foreground">
              Data processing compliant with GDPR & CCPA
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              onClick={handleDeclineAll}
              variant="outline"
              className="flex-1"
            >
              Essential Only
            </Button>
            <Button
              onClick={handleAcceptSelected}
              variant="default"
              className="flex-1"
            >
              Accept Selected
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Accept All
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              By using FUD Buddy, you agree to our processing of your data as described above.
            </p>
            <p>
              You can review our full{' '}
              <a href="/privacy-policy" className="underline hover:text-foreground">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/cookie-policy" className="underline hover:text-foreground">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyConsentModal;