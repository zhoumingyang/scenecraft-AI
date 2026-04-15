export type OpenRouterTextResponse = {
  id?: string;
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

export type OpenRouterTextContent =
  | string
  | Array<{
      type?: string;
      text?: string;
      image_url?: {
        url?: string;
      };
    }>
  | undefined;

export type OpenRouterRequestContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
          };
        }
    >;

export type OpenRouterRequestMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterRequestContent;
};
