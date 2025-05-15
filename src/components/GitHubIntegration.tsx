
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GitHubIntegration: React.FC = () => {
  // Open GitHub in a new tab
  const openGitHub = () => {
    window.open("https://github.com/new", "_blank");
  };

  return (
    <Card className="w-full max-w-3xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Connect to GitHub</CardTitle>
        <CardDescription>Steps to connect FUD Buddy to your GitHub repository</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Option 1: GitHub Integration (Recommended)</h3>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Click the GitHub icon in the top navigation bar of Lovable</li>
            <li>Authorize Lovable to connect with your GitHub account</li>
            <li>Select your repository or create a new one</li>
            <li>Lovable will push all your code to GitHub automatically</li>
          </ol>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Option 2: CLI Approach (Advanced)</h3>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Create a new repository on GitHub</li>
            <li>Clone the repository to your local machine</li>
            <li>Copy your Lovable project files into the cloned repository</li>
            <li>Follow the instructions in GitSetupInstructions.md</li>
            <li>Push the changes to GitHub</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={openGitHub} className="bg-[#2da44e] hover:bg-[#2c974b]">
          Create GitHub Repository
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GitHubIntegration;
