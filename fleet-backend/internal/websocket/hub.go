package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	conn *websocket.Conn
	send chan []byte
	role string
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WS: cliente conectado (rol=%s). Total: %d", client.role, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WS: cliente desconectado. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Canal lleno: el cliente es lento, desconectar
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastMessage(msgType string, data interface{}, adminOnly bool) {
	payload := map[string]interface{}{
		"type":       msgType,
		"data":       data,
		"admin_only": adminOnly,
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("WS: error serializando mensaje: %v", err)
		return
	}
	h.broadcast <- bytes
}

func (h *Hub) ServeWS(role string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WS: error en upgrade: %v", err)
			return
		}

		client := &Client{
			conn: conn,
			send: make(chan []byte, 256),
			role: role,
		}

		h.register <- client

		go client.writePump()
		go client.readPump(h)
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()
	for message := range c.send {
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			if adminOnly, ok := msg["admin_only"].(bool); ok && adminOnly && c.role != "admin" {
				continue
			}
		}
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func (c *Client) readPump(h *Hub) {
	defer func() {
		h.unregister <- c
		c.conn.Close()
	}()

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}
