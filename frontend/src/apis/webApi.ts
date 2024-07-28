import { CoyoteGameConfig } from "../types/CoyoteGameConfig";

export type GameConfigResData = {
    gameConfig: CoyoteGameConfig,
};

export type ApiResponse<T = {}> = {
    status: number,
    message?: string,
    errors?: string[],
} & Partial<T>;

export const webApi = {
    loadConfig: async (): Promise<ApiResponse<GameConfigResData> | null> => {
        try {
            const response = await fetch('/api/game_config');
            
            const responseText = await response.text();

            if (responseText[0] === '{') {
                return JSON.parse(responseText);
            } else {
                return {
                    status: 0,
                    message: responseText,
                };
            }
        }
        catch (error) {
            console.error('Failed to get server info:', error);
            return null;
        }
    },
    updateConfig: async (config: CoyoteGameConfig): Promise<ApiResponse | null> => {
        try {
            const response = await fetch('/api/game_config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameConfig: config }),
            });
            
            const responseText = await response.text();
            
            if (responseText[0] === '{') {
                return JSON.parse(responseText);
            } else {
                return {
                    status: 0,
                    message: responseText,
                };
            }
        }
        catch (error) {
            console.error('Failed to get client connect info:', error);
            return null;
        }
    },
};