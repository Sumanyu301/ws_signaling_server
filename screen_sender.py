import cv2
import numpy as np
import mss
import pyautogui
import websocket
import json
import struct
import pickle
import uuid

# Generate a unique ID for this sender
SENDER_ID = str(uuid.uuid4())

def connect_to_relay():
    # Connect to relay server
    ws = websocket.WebSocket()
    ws.connect('ws://localhost:8082')  # Adjust URL if needed
    
    # Register as sender
    ws.send(json.dumps({
        'type': 'role',
        'role': 'sender',
        'userId': SENDER_ID
    }))
    
    # Wait for confirmation
    response = json.loads(ws.recv())
    if response.get('type') == 'role_confirmation' and response.get('success'):
        print("Successfully registered as screen sender")
        return ws
    else:
        raise Exception("Failed to register as sender")

def start_screen_sharing(ws):
    try:
        sct = mss.mss()
        monitor = sct.monitors[1]  # Use primary monitor

        print("Starting screen sharing... Press Ctrl+C to stop")
        
        while True:
            try:
                # Capture screen
                sct_img = sct.grab(monitor)
                img = np.array(sct_img)

                # Get cursor position and draw it
                cursor_x, cursor_y = pyautogui.position()
                cursor_color = (0, 0, 255)  # Red color for cursor
                cursor_radius = 7
                cv2.circle(img, (cursor_x, cursor_y), cursor_radius, cursor_color, -1)

                # Convert image to BGR format
                frame = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

                # Compress frame
                _, compressed_frame = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

                # Serialize frame
                data = pickle.dumps(compressed_frame)

                # Send frame size followed by frame data
                ws.send_binary(struct.pack("L", len(data)) + data)

            except Exception as e:
                print(f"Error sending frame: {e}")
                break

    except KeyboardInterrupt:
        print("\nStopping screen sharing...")
    except Exception as e:
        print(f"Screen sharing error: {e}")
    finally:
        ws.close()

def main():
    try:
        ws = connect_to_relay()
        start_screen_sharing(ws)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()