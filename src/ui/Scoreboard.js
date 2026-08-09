/** Server-snapshot scoreboard. It never accepts client-created score values. */
export class Scoreboard {
  constructor(input) {
    this.input = input;
    this.root = document.getElementById('scoreboard');
    this.rows = document.getElementById('scoreboard-rows');
    this.title = document.getElementById('scoreboard-title');
  }

  update(snapshot, localPlayerId) {
    if (!this.rows || !snapshot) return;
    this.title.textContent = `${String(snapshot.mode || 'MATCH').replaceAll('-', ' ').toUpperCase()} — SCOREBOARD`;
    const ordered = [...(snapshot.players || [])].sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
    this.rows.replaceChildren(...ordered.map((player, index) => {
      const row = document.createElement('div');
      row.className = `scoreboard-row${player.id === localPlayerId ? ' local' : ''}`;
      row.textContent = `${index + 1}. ${player.displayName}  ${player.kills} K  ${player.deaths} D  ${player.assists} A  ${player.score} SCORE`;
      return row;
    }));
  }

  updateVisibility() {
    if (this.root) this.root.hidden = !this.input?.isDown('Tab');
  }
}
