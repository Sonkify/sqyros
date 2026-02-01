// Peripheral devices supported by Sqyros
// Devices marked as tier: 'basic' are available to free users
// Devices marked as tier: 'pro' require a Pro subscription

export const PERIPHERALS = {
  microphones: [
    {
      id: 'shure-mxa920',
      name: 'Shure MXA920',
      brand: 'Shure',
      description: 'Ceiling array microphone with IntelliMix',
      protocols: ['dante', 'aes67'],
      tier: 'basic',
    },
    {
      id: 'shure-mxa910',
      name: 'Shure MXA910',
      brand: 'Shure',
      description: 'Ceiling array microphone',
      protocols: ['dante'],
      tier: 'basic',
    },
    {
      id: 'shure-mxa710',
      name: 'Shure MXA710',
      brand: 'Shure',
      description: 'Linear array microphone',
      protocols: ['dante', 'usb'],
      tier: 'basic',
    },
    {
      id: 'shure-mxa310',
      name: 'Shure MXA310',
      brand: 'Shure',
      description: 'Table array microphone',
      protocols: ['dante', 'usb'],
      tier: 'basic',
    },
    {
      id: 'shure-mxn5-c',
      name: 'Shure MXN5-C',
      brand: 'Shure',
      description: 'Networked ceiling loudspeaker',
      protocols: ['dante'],
      tier: 'basic',
    },
    {
      id: 'sennheiser-tcc2',
      name: 'Sennheiser TeamConnect Ceiling 2',
      brand: 'Sennheiser',
      description: 'Ceiling microphone with beamforming',
      protocols: ['dante', 'aes67'],
      tier: 'pro',
    },
    {
      id: 'sennheiser-tcb',
      name: 'Sennheiser TeamConnect Bar',
      brand: 'Sennheiser',
      description: 'All-in-one video bar with audio',
      protocols: ['usb', 'hdmi', 'bluetooth'],
      tier: 'pro',
    },
    {
      id: 'audio-technica-atnd1061',
      name: 'Audio-Technica ATND1061DAN',
      brand: 'Audio-Technica',
      description: 'Beamforming ceiling array',
      protocols: ['dante'],
      tier: 'pro',
    },
    {
      id: 'biamp-parle-tcm-x',
      name: 'Biamp Parlé TCM-X',
      brand: 'Biamp',
      description: 'Ceiling beamtracking microphone',
      protocols: ['dante', 'usb'],
      tier: 'pro',
    },
    {
      id: 'biamp-parle-ttm-x',
      name: 'Biamp Parlé TTM-X',
      brand: 'Biamp',
      description: 'Table beamtracking microphone',
      protocols: ['dante', 'usb'],
      tier: 'pro',
    },
    {
      id: 'clearone-bma360',
      name: 'ClearOne BMA 360',
      brand: 'ClearOne',
      description: 'Beamforming microphone array ceiling tile',
      protocols: ['dante', 'usb'],
      tier: 'pro',
    },
    {
      id: 'yamaha-rm-cg',
      name: 'Yamaha RM-CG',
      brand: 'Yamaha',
      description: 'Ceiling array microphone',
      protocols: ['dante'],
      tier: 'pro',
    },
    {
      id: 'beyerdynamic-orbis',
      name: 'Beyerdynamic Orbis',
      brand: 'Beyerdynamic',
      description: 'Ceiling microphone system',
      protocols: ['dante', 'aes67'],
      tier: 'pro',
    },
  ],

  cameras: [
    {
      id: 'logitech-rally-bar',
      name: 'Logitech Rally Bar',
      brand: 'Logitech',
      description: 'All-in-one video bar for medium rooms',
      protocols: ['usb', 'hdmi'],
      tier: 'basic',
    },
    {
      id: 'logitech-rally-bar-mini',
      name: 'Logitech Rally Bar Mini',
      brand: 'Logitech',
      description: 'Compact video bar for small rooms',
      protocols: ['usb', 'hdmi'],
      tier: 'basic',
    },
    {
      id: 'logitech-rally-camera',
      name: 'Logitech Rally Camera',
      brand: 'Logitech',
      description: 'Premium PTZ conference camera',
      protocols: ['usb', 'hdmi'],
      tier: 'basic',
    },
    {
      id: 'poly-studio-x50',
      name: 'Poly Studio X50',
      brand: 'Poly',
      description: 'Video bar with built-in compute',
      protocols: ['usb', 'hdmi', 'ip'],
      tier: 'basic',
    },
    {
      id: 'poly-studio-x70',
      name: 'Poly Studio X70',
      brand: 'Poly',
      description: 'Premium video bar for large rooms',
      protocols: ['usb', 'hdmi', 'ip'],
      tier: 'basic',
    },
    {
      id: 'poly-eagleeye-director-ii',
      name: 'Poly EagleEye Director II',
      brand: 'Poly',
      description: 'Intelligent dual-camera system',
      protocols: ['hdmi', 'ip'],
      tier: 'pro',
    },
    {
      id: 'vaddio-roboshot-30e',
      name: 'Vaddio RoboSHOT 30E',
      brand: 'Vaddio',
      description: 'PTZ camera with 30x zoom',
      protocols: ['ip', 'hdmi', 'usb', 'hdbaset'],
      tier: 'pro',
    },
    {
      id: 'vaddio-intellishot',
      name: 'Vaddio IntelliSHOT',
      brand: 'Vaddio',
      description: 'ePTZ camera with auto-framing',
      protocols: ['ip', 'hdmi', 'usb'],
      tier: 'pro',
    },
    {
      id: 'ptzoptics-move-4k',
      name: 'PTZOptics Move 4K',
      brand: 'PTZOptics',
      description: '4K PTZ camera with NDI',
      protocols: ['ip', 'hdmi', 'usb', 'ndi', 'srt'],
      tier: 'pro',
    },
    {
      id: 'panasonic-aw-ue150',
      name: 'Panasonic AW-UE150',
      brand: 'Panasonic',
      description: 'Broadcast-quality 4K PTZ',
      protocols: ['ip', 'hdmi', 'sdi', 'ndi'],
      tier: 'pro',
    },
    {
      id: 'sony-srg-x400',
      name: 'Sony SRG-X400',
      brand: 'Sony',
      description: '4K PTZ camera with AI framing',
      protocols: ['ip', 'hdmi', 'usb'],
      tier: 'pro',
    },
    {
      id: 'aver-cam570',
      name: 'AVer CAM570',
      brand: 'AVer',
      description: '4K dual-lens AI camera',
      protocols: ['usb', 'hdmi', 'ip'],
      tier: 'pro',
    },
  ],

  speakers: [
    {
      id: 'qsc-ad-s6t',
      name: 'QSC AD-S6T',
      brand: 'QSC',
      description: 'Surface-mount loudspeaker',
      protocols: ['analog', 'q-sys'],
      tier: 'basic',
    },
    {
      id: 'qsc-ad-c6t',
      name: 'QSC AD-C6T',
      brand: 'QSC',
      description: 'Ceiling-mount loudspeaker',
      protocols: ['analog', 'q-sys'],
      tier: 'basic',
    },
    {
      id: 'biamp-desono-c-ic6',
      name: 'Biamp Desono C-IC6',
      brand: 'Biamp',
      description: 'In-ceiling loudspeaker',
      protocols: ['analog'],
      tier: 'basic',
    },
    {
      id: 'shure-mxn5-c',
      name: 'Shure MXN5-C',
      brand: 'Shure',
      description: 'Networked ceiling loudspeaker',
      protocols: ['dante'],
      tier: 'basic',
    },
    {
      id: 'crestron-saros-ic6t',
      name: 'Crestron Saros IC6T',
      brand: 'Crestron',
      description: 'In-ceiling speaker with transformer',
      protocols: ['analog'],
      tier: 'pro',
    },
    {
      id: 'bose-edgemax-em180',
      name: 'Bose EdgeMax EM180',
      brand: 'Bose',
      description: 'In-ceiling premium loudspeaker',
      protocols: ['analog'],
      tier: 'pro',
    },
    {
      id: 'jbl-control-16ct',
      name: 'JBL Control 16C/T',
      brand: 'JBL',
      description: 'Ceiling speaker',
      protocols: ['analog'],
      tier: 'pro',
    },
    {
      id: 'yamaha-vxc4',
      name: 'Yamaha VXC4',
      brand: 'Yamaha',
      description: 'In-ceiling speaker',
      protocols: ['analog'],
      tier: 'pro',
    },
  ],

  displays: [
    {
      id: 'samsung-qm85r',
      name: 'Samsung QM85R',
      brand: 'Samsung',
      description: '85" 4K UHD commercial display',
      protocols: ['hdmi', 'ip'],
      tier: 'basic',
    },
    {
      id: 'lg-um3df',
      name: 'LG UM3DF Series',
      brand: 'LG',
      description: '4K UHD commercial signage',
      protocols: ['hdmi', 'ip'],
      tier: 'basic',
    },
    {
      id: 'sony-bravia-bz40j',
      name: 'Sony BRAVIA BZ40J',
      brand: 'Sony',
      description: 'Professional 4K display',
      protocols: ['hdmi', 'ip'],
      tier: 'basic',
    },
    {
      id: 'microsoft-surface-hub-2s',
      name: 'Microsoft Surface Hub 2S',
      brand: 'Microsoft',
      description: 'Interactive collaboration display',
      protocols: ['hdmi', 'usb-c', 'ip'],
      tier: 'pro',
    },
    {
      id: 'google-jamboard',
      name: 'Google Jamboard',
      brand: 'Google',
      description: 'Interactive whiteboard display',
      protocols: ['hdmi', 'usb', 'ip'],
      tier: 'pro',
    },
    {
      id: 'cisco-webex-board',
      name: 'Cisco Webex Board Pro',
      brand: 'Cisco',
      description: 'All-in-one collaboration device',
      protocols: ['hdmi', 'usb-c', 'ip'],
      tier: 'pro',
    },
  ],

  signal_processors: [
    {
      id: 'shure-p300',
      name: 'Shure P300 IntelliMix',
      brand: 'Shure',
      description: 'Audio conferencing processor',
      protocols: ['dante', 'usb', 'analog'],
      tier: 'basic',
    },
    {
      id: 'shure-aniusb-matrix',
      name: 'Shure ANIUSB-MATRIX',
      brand: 'Shure',
      description: 'Dante/USB audio interface',
      protocols: ['dante', 'usb', 'analog'],
      tier: 'basic',
    },
    {
      id: 'biamp-tesira-forte-avb-vt',
      name: 'Biamp Tesira Forte AVB VT',
      brand: 'Biamp',
      description: 'Fixed I/O DSP with AVB',
      protocols: ['dante', 'avb', 'analog'],
      tier: 'pro',
    },
    {
      id: 'biamp-tesira-forte-dan-ci',
      name: 'Biamp Tesira Forte DAN CI',
      brand: 'Biamp',
      description: 'DSP with Dante and analog I/O',
      protocols: ['dante', 'analog'],
      tier: 'pro',
    },
    {
      id: 'crestron-dsp-1283',
      name: 'Crestron DSP-1283',
      brand: 'Crestron',
      description: 'DigitalMedia DSP',
      protocols: ['dante', 'analog'],
      tier: 'pro',
    },
    {
      id: 'extron-dmp-128-plus',
      name: 'Extron DMP 128 Plus',
      brand: 'Extron',
      description: 'ProDSP digital matrix processor',
      protocols: ['dante', 'analog'],
      tier: 'pro',
    },
    {
      id: 'yamaha-mtx5-d',
      name: 'Yamaha MTX5-D',
      brand: 'Yamaha',
      description: 'Matrix processor with Dante',
      protocols: ['dante', 'analog'],
      tier: 'pro',
    },
  ],

  wireless_systems: [
    {
      id: 'shure-ulxd4q',
      name: 'Shure ULXD4Q',
      brand: 'Shure',
      description: 'Quad-channel digital wireless receiver',
      protocols: ['dante', 'analog'],
      tier: 'basic',
    },
    {
      id: 'shure-slxd4d',
      name: 'Shure SLXD4D',
      brand: 'Shure',
      description: 'Dual-channel digital wireless',
      protocols: ['analog'],
      tier: 'basic',
    },
    {
      id: 'sennheiser-ew-dx',
      name: 'Sennheiser EW-DX',
      brand: 'Sennheiser',
      description: 'Digital wireless microphone system',
      protocols: ['dante', 'analog'],
      tier: 'pro',
    },
    {
      id: 'audio-technica-3000-series',
      name: 'Audio-Technica 3000 Series',
      brand: 'Audio-Technica',
      description: 'Digital wireless system',
      protocols: ['analog'],
      tier: 'pro',
    },
  ],

  switchers: [
    {
      id: 'extron-in1808',
      name: 'Extron IN1808',
      brand: 'Extron',
      description: '8-input HDMI/VGA scaling switcher',
      protocols: ['hdmi', 'vga', 'analog'],
      tier: 'basic',
    },
    {
      id: 'kramer-vs-411x',
      name: 'Kramer VS-411X',
      brand: 'Kramer',
      description: '4x1 HDMI auto switcher',
      protocols: ['hdmi'],
      tier: 'basic',
    },
    {
      id: 'crestron-nvx-dm-md8x8',
      name: 'Crestron NVX-DM-MD8X8',
      brand: 'Crestron',
      description: 'DM NVX 8x8 matrix switcher',
      protocols: ['dm-nvx', 'hdmi'],
      tier: 'pro',
    },
    {
      id: 'atlona-omni-111',
      name: 'Atlona OMNI-111',
      brand: 'Atlona',
      description: 'OmniStream single-channel encoder',
      protocols: ['omnistream', 'hdmi'],
      tier: 'pro',
    },
  ],

  control_interfaces: [
    {
      id: 'crestron-tsw-770',
      name: 'Crestron TSW-770',
      brand: 'Crestron',
      description: '7" touch panel',
      protocols: ['cip', 'ip'],
      tier: 'basic',
    },
    {
      id: 'extron-tlp-pro-1025m',
      name: 'Extron TLP Pro 1025M',
      brand: 'Extron',
      description: '10" wall-mount touch panel',
      protocols: ['ip'],
      tier: 'basic',
    },
    {
      id: 'amx-mxt-1001',
      name: 'AMX MXT-1001',
      brand: 'AMX',
      description: '10" modero X touch panel',
      protocols: ['ip', 'icsp'],
      tier: 'pro',
    },
    {
      id: 'qsc-tsc-116w',
      name: 'QSC TSC-116w-G2',
      brand: 'QSC',
      description: 'Q-SYS 16" touch screen controller',
      protocols: ['q-sys', 'ip'],
      tier: 'pro',
    },
  ],
}

// Connection types
export const CONNECTION_TYPES = [
  { id: 'dante', name: 'Dante', description: 'Audinate Dante audio-over-IP' },
  { id: 'aes67', name: 'AES67', description: 'Open standard audio-over-IP' },
  { id: 'avb', name: 'AVB', description: 'Audio Video Bridging' },
  { id: 'analog', name: 'Analog Audio', description: 'Traditional analog audio connections' },
  { id: 'usb', name: 'USB', description: 'USB audio/video connection' },
  { id: 'hdmi', name: 'HDMI', description: 'High-Definition Multimedia Interface' },
  { id: 'hdbaset', name: 'HDBaseT', description: 'HDMI over Cat6/7 cable' },
  { id: 'ndi', name: 'NDI', description: 'NewTek Network Device Interface' },
  { id: 'sdi', name: 'SDI', description: 'Serial Digital Interface' },
  { id: 'ip', name: 'IP Control', description: 'Network-based control protocol' },
  { id: 'serial', name: 'RS-232', description: 'Serial control connection' },
]

// Device categories
export const DEVICE_CATEGORIES = [
  { id: 'microphones', name: 'Microphones', icon: '🎤' },
  { id: 'cameras', name: 'Cameras', icon: '📹' },
  { id: 'speakers', name: 'Speakers', icon: '🔊' },
  { id: 'displays', name: 'Displays', icon: '🖥️' },
  { id: 'signal_processors', name: 'Signal Processors', icon: '🎛️' },
  { id: 'wireless_systems', name: 'Wireless Systems', icon: '📡' },
  { id: 'switchers', name: 'Switchers', icon: '🔀' },
  { id: 'control_interfaces', name: 'Control Interfaces', icon: '🎮' },
]

// Helper functions
export function getDeviceById(id) {
  for (const category of Object.values(PERIPHERALS)) {
    const device = category.find((d) => d.id === id)
    if (device) return device
  }
  return null
}

export function getDevicesByCategory(categoryId) {
  return PERIPHERALS[categoryId] || []
}

export function getDevicesByTier(tier) {
  const devices = []
  for (const category of Object.values(PERIPHERALS)) {
    devices.push(...category.filter((d) => d.tier === tier || tier === 'pro'))
  }
  return devices
}

export function getDevicesByProtocol(protocol) {
  const devices = []
  for (const category of Object.values(PERIPHERALS)) {
    devices.push(...category.filter((d) => d.protocols.includes(protocol)))
  }
  return devices
}

export function getCompatibleConnections(systemId, deviceId) {
  const { getSystemById } = require('./coreSystems')
  const system = getSystemById(systemId)
  const device = getDeviceById(deviceId)

  if (!system || !device) return []

  // Find common protocols between system and device
  return system.protocols.filter((p) => device.protocols.includes(p))
}

// Get all devices as a flat array
export function getAllDevices() {
  const devices = []
  for (const [category, categoryDevices] of Object.entries(PERIPHERALS)) {
    for (const device of categoryDevices) {
      devices.push({ ...device, category })
    }
  }
  return devices
}
