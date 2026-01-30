export interface ServerToClientEvents {
    card_played: (data: { playerId: string, card: any }) => void;
    start_khlopokopyt: (data: { message: string }) => void;
    player_joined: (data: { playerName: string }) => void;
  }
  
  export interface ClientToServerEvents {
    join_game: (data: { gameId: string, playerName: string }) => void;
    play_card: (data: { gameId: string, card: any }) => void;
    tap_khlopokopyt: (data: { gameId: string }) => void;
  }