import { AppSidebar } from 'src/widgets/sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen">
            <AppSidebar />
            <div className="flex flex-1 flex-col">{children}</div>
        </div>
    );
}
