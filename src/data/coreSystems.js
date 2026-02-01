// Core AV Systems supported by Sqyros
export const CORE_SYSTEMS = [
  {
    id: 'qsc-qsys',
    name: 'QSC Q-SYS',
    brand: 'QSC',
    description: 'Networked audio, video, and control platform',
    protocols: ['dante', 'aes67', 'analog', 'usb', 'hdmi'],
    controlProtocols: ['q-sys-native', 'tcp', 'serial'],
    icon: '🎛️',
  },
  {
    id: 'crestron',
    name: 'Crestron',
    brand: 'Crestron',
    description: 'Enterprise AV control and automation systems',
    protocols: ['dante', 'analog', 'hdmi', 'dm-nvx', 'avf'],
    controlProtocols: ['cip', 'tcp', 'serial', 'ir'],
    icon: '🏢',
  },
  {
    id: 'biamp-tesira',
    name: 'Biamp Tesira',
    brand: 'Biamp',
    description: 'Digital signal processing and audio networking',
    protocols: ['dante', 'aes67', 'analog', 'avb'],
    controlProtocols: ['ttp', 'tcp', 'serial'],
    icon: '🔊',
  },
  {
    id: 'extron',
    name: 'Extron',
    brand: 'Extron',
    description: 'AV signal processing, distribution, and control',
    protocols: ['dante', 'analog', 'hdmi', 'nax', 'dtp'],
    controlProtocols: ['sis', 'tcp', 'serial'],
    icon: '📡',
  },
  {
    id: 'amx',
    name: 'AMX by Harman',
    brand: 'AMX',
    description: 'Control and automation systems',
    protocols: ['dante', 'analog', 'hdmi', 'svsi'],
    controlProtocols: ['icsp', 'tcp', 'serial', 'ir'],
    icon: '🎮',
  },
  {
    id: 'kramer',
    name: 'Kramer',
    brand: 'Kramer',
    description: 'Signal management and collaboration solutions',
    protocols: ['dante', 'analog', 'hdmi', 'via'],
    controlProtocols: ['p3000', 'tcp', 'serial'],
    icon: '🔗',
  },
  {
    id: 'atlona',
    name: 'Atlona',
    brand: 'Atlona',
    description: 'AV switching, distribution, and collaboration',
    protocols: ['dante', 'hdmi', 'omnistream', 'hdbaset'],
    controlProtocols: ['tcp', 'serial', 'ir'],
    icon: '🌐',
  },
  {
    id: 'shure-ani',
    name: 'Shure ANI (Audio Network Interface)',
    brand: 'Shure',
    description: 'Audio networking interfaces and DSP',
    protocols: ['dante', 'aes67', 'analog'],
    controlProtocols: ['shure-control', 'tcp'],
    icon: '🎤',
  },
  {
    id: 'yealink-av-one',
    name: 'Yealink AV ONE',
    brand: 'Yealink',
    description: 'Video conferencing and collaboration',
    protocols: ['dante', 'usb', 'hdmi'],
    controlProtocols: ['tcp', 'api'],
    icon: '📹',
  },
  {
    id: 'poly',
    name: 'Poly/HP Poly',
    brand: 'Poly',
    description: 'Video and voice collaboration solutions',
    protocols: ['usb', 'hdmi', 'ip', 'bluetooth'],
    controlProtocols: ['tcp', 'api', 'serial'],
    icon: '💼',
  },
]

// Helper function to get system by ID
export function getSystemById(id) {
  return CORE_SYSTEMS.find((system) => system.id === id)
}

// Helper function to get systems by protocol
export function getSystemsByProtocol(protocol) {
  return CORE_SYSTEMS.filter((system) =>
    system.protocols.includes(protocol.toLowerCase())
  )
}
