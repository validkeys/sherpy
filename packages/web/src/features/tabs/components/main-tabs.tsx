import { useAtom } from 'jotai';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ChatContainer } from '@/features/chat';
import { activeTabAtom } from '../stores/tab-atoms';

interface MainTabsProps {
  projectId: string;
}

export function MainTabs({ projectId }: MainTabsProps) {
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'chat' | 'files')}
      className="flex flex-col h-full"
    >
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="flex-1 overflow-hidden">
        <ChatContainer projectId={projectId} />
      </TabsContent>
      <TabsContent value="files" className="flex-1 overflow-hidden">
        <div className="p-4 text-muted-foreground">Files content (placeholder)</div>
      </TabsContent>
    </Tabs>
  );
}
