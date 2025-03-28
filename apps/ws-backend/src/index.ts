import { WebSocketServer, WebSocket } from 'ws';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET } from './config';

// Create the WebSocket server
const wss = new WebSocketServer({ port: 8080 });

// Extend the WebSocket interface to add custom properties
interface CustomWebSocket extends WebSocket {
  userId?: string;
}

wss.on('connection', function connection(ws: CustomWebSocket, request) {
  // Ensure request is a proper HTTP request
  if (!(request instanceof Request)) {
    ws.close();
    return;
  }

  // Parse the URL
  const url = request.url;
  if (!url) {
    ws.close();
    return;
  }

  // Extract query parameters
  const queryParameters = new URLSearchParams(url.split('?')[1] || '');
  const token = queryParameters.get('token') || '';

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Log connection to specific room (using decoded token info)
    console.log(`Connected to room ${decoded.id || 'unknown'}`);

    // Attach user ID to the socket if available
    ws.userId = decoded.id;

    // Error handling
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Message handling
    ws.on('message', (data: Buffer) => {
      console.log('Received message:', data.toString());
      
      // add more message processing logic here
    });

    // Send initial message
    ws.send('Connected successfully');

  } catch (error) {
    console.error('Authentication failed:', error);
    ws.close();
  }
});

// Optional: Handle server-level errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});