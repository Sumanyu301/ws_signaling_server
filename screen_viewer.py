import cv2
import numpy as np
import websocket
import json
import struct
import pickle
import uuid

# Generate a unique ID for this viewer
VIEWER_ID = str(uuid.uuid4())

def connect_to_relay():
    # Connect to relay server
    ws = websocket.WebSocket()
    ws.connect('ws://localhost:8082')  # Adjust URL if needed
    
    # Register as viewer
    ws.send(json.dumps({
        'type': 'role',
        'role': 'viewer',
        'userId': VIEWER_ID
    }))
    
    # Wait for confirmation
    response = json.loads(ws.recv())
    if response.get('type') == 'role_confirmation' and response.get('success'):
        print("Successfully registered as screen viewer")
        return ws
    else:
        raise Exception("Failed to register as viewer")

def start_viewing(ws):
    try:
        cv2.namedWindow("Remote Screen", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Remote Screen", 1280, 720)

        print("Starting screen viewer... Press ESC to stop")
        
        data = b""
        payload_size = struct.calcsize("L")

        while True:
            try:
                # Get frame size
                while len(data) < payload_size:
                    data += ws.recv_data()[1]  # recv_data returns (opcode, data)

                packed_msg_size = data[:payload_size]
                data = data[payload_size:]
                msg_size = struct.unpack("L", packed_msg_size)[0]

                # Get frame data
                while len(data) < msg_size:
                    data += ws.recv_data()[1]

                frame_data = data[:msg_size]
                data = data[msg_size:]

                # Deserialize and display frame
                frame = pickle.loads(frame_data)
                frame = cv2.imdecode(frame, cv2.IMREAD_COLOR)
                cv2.imshow("Remote Screen", frame)

                # Check for ESC key
                if cv2.waitKey(1) & 0xFF == 27:
                    break

            except Exception as e:
                print(f"Error receiving frame: {e}")
                break

    except KeyboardInterrupt:
        print("\nStopping screen viewing...")
    except Exception as e:
        print(f"Screen viewing error: {e}")
    finally:
        cv2.destroyAllWindows()
        ws.close()

def main():
    try:
        ws = connect_to_relay()
        start_viewing(ws)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()