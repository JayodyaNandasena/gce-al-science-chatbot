import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const TypingIndicator = ({ config }) => {
    const Icon = config.icon;

    return (
        <div className="flex gap-4 mb-6">
            <Avatar className={`h-8 w-8 bg-gradient-to-br ${config.gradient} flex-shrink-0`}>
                <AvatarFallback className="bg-transparent text-white">
                    <Icon className="w-4 h-4" />
                </AvatarFallback>
            </Avatar>

            <div className={`bg-white rounded-2xl px-4 py-3 border ${config.borderColor} shadow-sm`}>
                <div className="flex gap-1">
                    <div className={`w-2 h-2 bg-gradient-to-r ${config.gradient} rounded-full animate-bounce`} style={{ animationDelay: "0ms" }} />
                    <div className={`w-2 h-2 bg-gradient-to-r ${config.gradient} rounded-full animate-bounce`} style={{ animationDelay: "150ms" }} />
                    <div className={`w-2 h-2 bg-gradient-to-r ${config.gradient} rounded-full animate-bounce`} style={{ animationDelay: "300ms" }} />
                </div>
            </div>
        </div>
    );
};
