// Token cancellation prevents late media callbacks from reviving old orders.
export class OrderAudio {
  private cache=new Map<string,HTMLAudioElement>(); private token=0;private current:HTMLAudioElement|null=null;
  private cancelPending:(()=>void)|null=null;
  get active():boolean{return this.current!==null;}
  preload(urls:string[]){
    this.stop();for(const [url,a] of this.cache)if(!urls.includes(url)){a.src='';this.cache.delete(url);}
    for(const url of urls)if(!this.cache.has(url)){const a=new Audio(url);a.preload='auto';this.cache.set(url,a);a.load();}
  }
  stop(){this.token++;this.cancelPending?.();this.cancelPending=null;if(this.current){this.current.pause();this.current.currentTime=0;this.current=null;}}
  play(url:string,enabled:boolean,onFallback:()=>void,onEnd:()=>void):void {
    this.stop();const token=this.token;
    if(!enabled){onFallback();onEnd();return;}
    const a=this.cache.get(url)||new Audio(url);this.current=a;
    let timer:ReturnType<typeof setTimeout>;let done=false;
    const clean=()=>{clearTimeout(timer);a.removeEventListener('playing',playing);a.removeEventListener('ended',ended);a.removeEventListener('error',error);};
    const finish=(failed:boolean)=>{
      if(done||token!==this.token)return;done=true;clean();this.current=null;this.cancelPending=null;
      if(failed){a.pause();onFallback();}onEnd();
    };
    const playing=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(true),12000);};
    const ended=()=>finish(false),error=()=>finish(true);
    this.cancelPending=clean;a.addEventListener('playing',playing);a.addEventListener('ended',ended);a.addEventListener('error',error);
    timer=setTimeout(()=>finish(true),2500);a.currentTime=0;a.play().catch(error);
  }
}
