

// Removed unused Card imports
import { Lock, LockIcon, Unlock, UnlockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";


const modules = [
  {
    title: "Introduction",
    unlocked: true,
    type: "video",
    file: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    status: "completed",
    duration: "2:20",
    htmlContent: `
 
  <h2 class="text-2xl font-semibold mt-6 mb-2">📌 What You Will Learn</h2>
  <ul class="list-disc list-inside space-y-1">
    <li>History and evolution of software engineering</li>
    <li>Software development life cycle (SDLC)</li>
    <li>Best practices and coding standards</li>
    <li>Real-world case studies</li>
  </ul>
  <p class="mt-4">Software engineering is <strong>more than coding</strong> — it's about solving problems...</p>
`
,
    description: `Welcome to the Course — this is the intro.`,
    hasPrerequisiteExam: false,
  },
  {
    title: "Module 1: Basics",
    unlocked: true,
    type: "pdf",
    file: "https://www.youtube.com/embed/9bZkp7q19f0",
    status: "in-progress",
    htmlContent: `
      <h1>Module 1: Basics</h1>
      <p>This module covers the fundamentals: version control, code style, and simple algorithms.</p>
      <h2>Topics</h2>
      <ul>
        <li>Git &amp; branching strategies</li>
        <li>Linting &amp; formatting</li>
        <li>Basic data structures</li>
      </ul>
    `,
    description: `# Welcome to the Course\nThis is the introduction to the course. Here you'll learn what to expect and how to succeed.`,
  },
  {
    title: "Module 1: Basics",
    unlocked: true,
    type: "pdf",
    file: "https://www.youtube.com/embed/9bZkp7q19f0",
    description: `## Module 1 Overview\nLearn the basics of the subject with hands-on examples.`,
  },
  {
    title: "Module 2: Advanced Topics",
    unlocked: false,
    type: "ppt",
    file: "https://www.youtube.com/embed/3JZ_D3ELwOQ",
    description: `## Locked Module\nComplete previous modules to unlock this content.`,
  },
];
 


export default function Learn() {
  const [selected, setSelected] = useState(0);
 const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(modules[selected].htmlContent || "");
  }, [modules[selected].htmlContent]);
function renderEmbeddedContent(module: typeof modules[number]) {
    switch (module.type) {
        case "video":
            return (
                <iframe
                    src={module.file}
                    className="aspect-video w-full"
                    allowFullScreen
                />
            );
        case "pdf":
            return (
                <iframe
                    src={module.file}
                    className="aspect-video w-full"
                    title="PDF Document"
                />
            );
        case "ppt":
            return (
                <iframe
                    src={module.file}
                    className="aspect-video w-full"
                    title="PowerPoint Presentation"
                />
            );
        default:
            return <div>Unsupported content type</div>;
    }
}

  return (
    <SidebarProvider>
         <SidebarTrigger className="ml-4 " />
      <AppSidebar />
        <SidebarInset>
    <div className="flex flex-col w-full h-screen pt-[10px] pr-[40px]  overflow-y-auto    ">
    
      

 

  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold ">
        {modules[selected].title}
      </h1>
      <p className=" text-sm">
        Enhance your skills with this module
      </p>
    </div>

    {/* Module Selector replacing timezone select */}
      <Select value={selected.toString()} onValueChange={(v) => setSelected(Number(v))}>
        <SelectTrigger className="">
          <SelectValue placeholder="Select a module" />
        </SelectTrigger>
        <SelectContent>
          {modules.map((m, idx) => (
            <SelectItem
              key={m.title}
              value={idx.toString()}
              disabled={!m.unlocked}
            >
              <div className="flex items-center gap-2 w-full">
                {m.unlocked ? (
                  <Unlock className="w-4 h-4 text-green-500" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="truncate">{m.title}</span>
                {
                    !m.unlocked?<LockIcon />:<UnlockIcon/>
                }
                
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  </div>


  <Separator className="my-4 bg-white/20" />


  <div className="bg-muted w-[70%]">
    
   {renderEmbeddedContent(modules[selected])}
  </div>
     {/* Markdown Description */}
         <div
            className="prose dark:prose-invert max-w-none   mt-4"
            // the sanitizedHtml is safe because we run it through DOMPurify
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />

              <div className="p-[20px]">
            {modules[selected].hasPrerequisiteExam ? (
              <Button onClick={() => {/* go to exam handler */}} className="bg-primary text-white">
                Go to Exam
              </Button>
            ) : (
              <Button onClick={() => {/* mark complete handler */}} className="bg-green-600 text-white">
                Mark Complete
              </Button>
            )}
          </div>

     

    </div>
        </SidebarInset>
        </SidebarProvider>
  );
}
