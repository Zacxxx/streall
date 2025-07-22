
import { Card, CardContent } from '@/components/ui/card';

export function MovieChatInterface() {
  return (
    <Card className="bg-slate-900/50 border-slate-700 h-full flex flex-col">
      <CardContent className="p-6 flex-grow flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Movie Assistant</h2>
        <p className="text-slate-400 mb-6">
          Chat with our AI to find movies, get recommendations, or generate custom selections.
        </p>
        {/* Placeholder for chat interface */}
        <div className="flex-grow bg-slate-800 rounded-lg p-4 flex items-center justify-center text-slate-500">
          <p>Conversational Movie Assistant Coming Soon!</p>
        </div>
      </CardContent>
    </Card>
  );
}
