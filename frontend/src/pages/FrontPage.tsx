import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";


export default function FrontPage() {
  return (
 <div className="w-screen flex flex-col gap-2 items-center justify-center h-screen" >
    <h1>Welcome to the Front Page</h1>
    <p>this is wellcome page </p>
    <Button  onClick={
      ()=>{
        window.location.href = "/home";
      }
    } variant={"default"}>Continue</Button>
    <ModeToggle/>
 </div>
  )
}
