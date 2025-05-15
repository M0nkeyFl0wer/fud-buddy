
import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ConfigLink: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/config">
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Configure AI & Analytics</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ConfigLink;
