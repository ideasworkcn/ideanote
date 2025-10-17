import { Node, mergeAttributes } from '@tiptap/core'

export const IframeExtension = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null
      },
      frameborder: {
        default: '0'
      },
      allowfullscreen: {
        default: true
      },
      scrolling: {
        default: 'no'
      },
      framespacing: {
        default: '0'
      },
      border: {
        default: '0'
      },
      sandbox: {
        default: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
      },
      style: {
        default: 'pointer-events: auto !important;'
      }
    }
  },

  parseHTML() {
    return [{
      tag: 'iframe'
    }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 
      class: 'iframe-wrapper relative group cursor-pointer select-all', 
      contenteditable: 'true',
      draggable: 'true'
    }, [
      'iframe',
      mergeAttributes(HTMLAttributes, {
        class: 'w-full aspect-video rounded-lg',
        style: 'pointer-events: auto !important;',
        allow: 'autoplay; fullscreen'
      })
    ]]
  }
})