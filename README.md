# Gesture Slingshot Cannon

A gesture-controlled slingshot game that uses hand tracking to create an interactive web experience. Built with React, TypeScript, and MediaPipe for real-time hand detection.

## Features

- **Hand Tracking**: Real-time hand detection using MediaPipe
- **Gesture Control**: Pinch gestures to control the slingshot
- **Visual Feedback**: Live camera preview with gesture indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive camera permission and browser compatibility checks

## Prerequisites

- Node.js (v16 or higher)
- Modern browser with camera support (Chrome, Firefox, Safari)
- HTTPS connection or localhost for camera access

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

1. Allow camera access when prompted
2. Position your hand in view of the camera
3. Use pinch gestures to control the slingshot
4. Release to shoot projectiles

## Project Structure

```
├── components/
│   ├── HandController.tsx    # Hand tracking and gesture detection
│   └── SlingshotCanvas.tsx   # Main game canvas
├── services/
│   └── handTracking.ts       # MediaPipe integration
├── utils/
│   └── types.ts             # TypeScript interfaces
├── App.tsx                  # Main application component
└── AGENTS.md               # Development guidelines
```

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Browser Compatibility

This application requires:
- Camera access (HTTPS or localhost)
- Modern browser with WebRTC support
- JavaScript ES2022 support

## Troubleshooting

**Camera not working?**
- Ensure you're using HTTPS or localhost
- Check browser camera permissions
- Try refreshing the page and granting permission again

**Hand detection not working?**
- Ensure good lighting conditions
- Position your hand clearly in the camera view
- Check that your browser supports MediaPipe

## Credits

The slingshot user experience and interaction design is inspired by and based on the work by [GSAP (GreenSock)](https://codepen.io/GreenSock/pen/MYYvaLy?editors=1000). We appreciate their excellent animation library and creative examples that made this project possible.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
