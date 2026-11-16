export const MUSIC_PATH='audio/music/gameplay-loop.mp3';

export class GameplayMusic {
  readonly element=new Audio(MUSIC_PATH);
  unavailable=false;
  private unlocked=false;
  private wanted=false;
  private starting=false;
  private request=0;

  constructor(private onChange:()=>void=()=>{}){
    this.element.loop=true;
    this.element.volume=.2;
    this.element.preload='none';
    this.element.addEventListener('error',()=>this.fail());
  }
  unlock(){this.unlocked=true;this.sync();}
  retry(){if(this.unavailable){this.unavailable=false;this.element.load();}this.unlock();}
  update(enabled:boolean,speaking:boolean){
    this.wanted=enabled;
    // Menus and game pauses leave the track running; only speech lowers its volume.
    this.element.muted=false;
    this.element.volume=speaking?.04:.2;
    this.sync();
  }
  private fail(){
    this.request++;this.starting=false;this.unavailable=true;this.element.pause();this.onChange();
  }
  private sync(){
    if(!this.wanted||!this.unlocked||this.unavailable){
      if(!this.element.paused||this.starting){this.request++;this.starting=false;this.element.pause();}
      return;
    }
    if(!this.element.paused||this.starting)return;
    const request=++this.request;this.starting=true;
    this.element.play().then(()=>{
      if(request!==this.request)return;
      this.starting=false;this.sync();
    }).catch(()=>{
      if(request===this.request)this.fail();
    });
  }
}
