import squarefulSource from '../../resource-packs/squareful/pack-source.json';

export interface CreditLink {
  label: string;
  url: string;
}

export interface Credit {
  title: string;
  author: string;
  license: CreditLink;
  source: CreditLink;
  // What this app does with the work, for licenses that ask to state changes
  note?: string;
}

const CC_BY_NC_ND_4: CreditLink = {
  label: 'CC BY-NC-ND 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
};

const SIL_OFL: CreditLink = {
  label: 'SIL Open Font License 1.1',
  url: 'https://openfontlicense.org',
};

const MIT: CreditLink = { label: 'MIT', url: 'https://opensource.org/license/mit' };

// The pack's version and download page come from the same pin the setup script downloads
export const TEXTURE_CREDITS: Credit[] = [
  {
    title: `${squarefulSource.title} ${squarefulSource.version}`,
    author: squarefulSource.author,
    license: CC_BY_NC_ND_4,
    source: { label: 'Modrinth', url: squarefulSource.page },
    note: 'Block textures are copied unchanged into one atlas image so the editor can draw them. No texture is redrawn or recolored.',
  },
];

export const FONT_CREDITS: Credit[] = [
  {
    title: 'Chakra Petch',
    author: 'Cadson Demak',
    license: SIL_OFL,
    source: { label: 'Google Fonts', url: 'https://fonts.google.com/specimen/Chakra+Petch' },
  },
  {
    title: 'Lexend',
    author: 'Bonnie Shaver-Troup, Thomas Jockin, and contributors',
    license: SIL_OFL,
    source: { label: 'Google Fonts', url: 'https://fonts.google.com/specimen/Lexend' },
  },
  {
    title: 'Red Hat Mono',
    author: 'Red Hat, Inc.',
    license: SIL_OFL,
    source: { label: 'Google Fonts', url: 'https://fonts.google.com/specimen/Red+Hat+Mono' },
  },
];

export const LIBRARY_CREDITS: Credit[] = [
  {
    title: 'Babylon.js',
    author: 'The Babylon.js team',
    license: { label: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
    source: { label: 'GitHub', url: 'https://github.com/BabylonJS/Babylon.js' },
  },
  {
    title: 'React',
    author: 'Meta Platforms, Inc.',
    license: MIT,
    source: { label: 'GitHub', url: 'https://github.com/facebook/react' },
  },
  {
    title: 'Material UI',
    author: 'MUI',
    license: MIT,
    source: { label: 'GitHub', url: 'https://github.com/mui/material-ui' },
  },
  {
    title: 'dnd kit',
    author: 'Claudéric Demers',
    license: MIT,
    source: { label: 'GitHub', url: 'https://github.com/clauderic/dnd-kit' },
  },
  {
    title: 'react-window',
    author: 'Brian Vaughn',
    license: MIT,
    source: { label: 'GitHub', url: 'https://github.com/bvaughn/react-window' },
  },
];

export const MINECRAFT_NOTICE =
  'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.';
