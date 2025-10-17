export const novelcopy = (title = "Title", intro = "AI-powered autocompletion") => {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: title }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: intro,
          },
        ],
      },
    ],
  };
};