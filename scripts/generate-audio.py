"""Build-time voice assets; the delivered game never requests a speech service."""
import asyncio, json, sys
from pathlib import Path
sys.path.insert(0, str(Path('.tools/python').resolve()))
import edge_tts
labels = {'edificio':'el edificio','supermercado':'el supermercado','parque':'el parque',
 'restaurante':'el restaurante','cine':'el cine','plaza':'la plaza','juguetes':'la tienda de juguetes',
 'dulces':'la tienda de dulces','hamburgueseria':'la hamburguesería','hospital':'el hospital',
 'centro_comercial':'el centro comercial','pizzeria':'la pizzería'}
async def main():
 Path('public/audio/orders').mkdir(parents=True,exist_ok=True)
 for id,label in labels.items():
  target=Path(f'public/audio/orders/{id}.mp3')
  if target.exists() and target.stat().st_size>1000: continue
  await edge_tts.Communicate(f'La entrega es en {label}.','es-ES-ElviraNeural',rate='-10%').save(str(target))
  print(id, target.stat().st_size, flush=True)
asyncio.run(main())
