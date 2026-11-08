// Saku's summer festival: id → [ja, en, mode]. mode: n = normal, w = whisper at your ear, d = drowned by the fireworks.
// Voice: ElevenLabs (tools/eleven/cast.json "saku", r1_a) — scripts/voice.py holds the tagged text.
window.SAKU_LINES = {
  "k01": ["おーい、こっち！ …ったく、毎年はぐれるよな、お前。", "Hey, over here! …Honestly, you get lost every single year.", "n"],
  "k02": ["ほら、手。 …はぐれるなよ。", "Here, your hand. …Don't get lost.", "n"],
  "k03": ["焼きそばの屋台、あっついな。 …人、多すぎ。 上、行こうぜ。", "That yakisoba stall is scorching. …Way too many people. Let's go up.", "n"],
  "k04": ["ふう。 …ここ、昔よく二人で来たよな。", "Phew. …We used to come up here a lot, the two of us.", "n"],
  "k05": ["暑いだろ。 あおいでやるよ。", "You're hot, right? I'll fan you.", "n"],
  "k06": ["どう、涼しい？ …ほら、反対側も。", "Better? …Here, the other side too.", "n"],
  "k07a": ["はいはい、お姫様。 …ったく、しょうがねえな。", "Yes, yes, princess. …Honestly, what am I going to do with you.", "n"],
  "k07b": ["だーめ。 今日は、俺にやらせて。", "Nope. Tonight, let me do it.", "n"],
  "k08": ["かき氷、買ってきた。 宇治金時。 …ほら、あーん。", "I got shaved ice. Matcha with red beans. …Here, say aah.", "n"],
  "k09a": ["…今日は素直じゃん。 冷たい？", "…You're obedient tonight. Cold?", "n"],
  "k09b": ["照れんなって。 …ほら、溶けるぞ。", "Don't be shy. …Come on, it's melting.", "n"],
  "k10": ["なあ。 かき氷食ったあとの息、冷たいって知ってる？", "Hey. Did you know your breath goes cold after shaved ice?", "n"],
  "k11": ["…な？ 冷たいだろ。 …顔、赤いぞ。", "…See? Cold, right? …Your face is red.", "w"],
  "k12": ["花火、毎年一緒に見てるけどさ。 今年は――", "We watch the fireworks together every year, but this year—", "d"],
  "k13": ["…今年は、幼なじみとしてじゃなくて、見たかったんだ。 …お前の隣で。", "…This year, I wanted to watch them not as your childhood friend. …Right beside you.", "w"],
  "k14": ["…返事、聞かせて。", "…Let me hear your answer.", "n"],
  "k15a": ["…来年も、再来年も。 俺の隣、空けとけよ。", "…Next year, and the year after. Keep the place next to me free.", "w"],
  "k15b": ["…ずっと、な。 もう、幼なじみには戻らねえから。", "…Forever, then. I'm not going back to being just your childhood friend.", "w"]
};
