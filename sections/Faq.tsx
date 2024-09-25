import Icon from "site/components/ui/Icon.tsx";

export interface CTA {
  id?: string;
  href: string;
  text: string;
  outline?: boolean;
}

export interface Question {
  title: string;
  /** @format rich-text */
  answer: string;
}

export interface Props {
  title?: string;
  description?: string;
  cta?: CTA;
  questions?: Question[];
}

export default function BlogPosts({
  title = "FAQs",
  description =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.",
  cta = { id: "change-me", href: "/", text: "Change me", outline: true },
  questions = [
    {
      title: "Question #1 text goes here",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut vestibulum ligula. Nam et tellus sit amet magna convallis interdum. Integer fermentum ligula nec velit hendrerit, quis feugiat odio feugiat. Ut vel nisi auctor, rhoncus felis vitae, tempor metus. Fusce ut lectus et ex consectetur ullamcorper. Nulla facilisi. Proin ullamcorper, odio a consectetur posuere, mauris felis rutrum lectus, et convallis est risus vitae nisi. Suspendisse potenti. Donec ultricies consectetur lorem, eget tempor nisi cursus in. Vivamus at nulla eros. Sed nec malesuada mauris. Curabitur id ex sed neque rutrum tincidunt. Sed sed lectus nec libero eleifend luctus. Aenean convallis feugiat elit, non tincidunt eros vehicula sed. Phasellus pretium urna sit amet risus interdum tempor.",
    },
    {
      title: "Question #2 text goes here",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut vestibulum ligula. Nam et tellus sit amet magna convallis interdum. Integer fermentum ligula nec velit hendrerit, quis feugiat odio feugiat. Ut vel nisi auctor, rhoncus felis vitae, tempor metus. Fusce ut lectus et ex consectetur ullamcorper. Nulla facilisi. Proin ullamcorper, odio a consectetur posuere, mauris felis rutrum lectus, et convallis est risus vitae nisi. Suspendisse potenti. Donec ultricies consectetur lorem, eget tempor nisi cursus in. Vivamus at nulla eros. Sed nec malesuada mauris. Curabitur id ex sed neque rutrum tincidunt. Sed sed lectus nec libero eleifend luctus. Aenean convallis feugiat elit, non tincidunt eros vehicula sed. Phasellus pretium urna sit amet risus interdum tempor.",
    },
    {
      title: "Question #3 text goes here",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut vestibulum ligula. Nam et tellus sit amet magna convallis interdum. Integer fermentum ligula nec velit hendrerit, quis feugiat odio feugiat. Ut vel nisi auctor, rhoncus felis vitae, tempor metus. Fusce ut lectus et ex consectetur ullamcorper. Nulla facilisi. Proin ullamcorper, odio a consectetur posuere, mauris felis rutrum lectus, et convallis est risus vitae nisi. Suspendisse potenti. Donec ultricies consectetur lorem, eget tempor nisi cursus in. Vivamus at nulla eros. Sed nec malesuada mauris. Curabitur id ex sed neque rutrum tincidunt. Sed sed lectus nec libero eleifend luctus. Aenean convallis feugiat elit, non tincidunt eros vehicula sed. Phasellus pretium urna sit amet risus interdum tempor.",
    },
    {
      title: "Question #4 text goes here",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut vestibulum ligula. Nam et tellus sit amet magna convallis interdum. Integer fermentum ligula nec velit hendrerit, quis feugiat odio feugiat. Ut vel nisi auctor, rhoncus felis vitae, tempor metus. Fusce ut lectus et ex consectetur ullamcorper. Nulla facilisi. Proin ullamcorper, odio a consectetur posuere, mauris felis rutrum lectus, et convallis est risus vitae nisi. Suspendisse potenti. Donec ultricies consectetur lorem, eget tempor nisi cursus in. Vivamus at nulla eros. Sed nec malesuada mauris. Curabitur id ex sed neque rutrum tincidunt. Sed sed lectus nec libero eleifend luctus. Aenean convallis feugiat elit, non tincidunt eros vehicula sed. Phasellus pretium urna sit amet risus interdum tempor.",
    },
    {
      title: "Question #5 text goes here",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut vestibulum ligula. Nam et tellus sit amet magna convallis interdum. Integer fermentum ligula nec velit hendrerit, quis feugiat odio feugiat. Ut vel nisi auctor, rhoncus felis vitae, tempor metus. Fusce ut lectus et ex consectetur ullamcorper. Nulla facilisi. Proin ullamcorper, odio a consectetur posuere, mauris felis rutrum lectus, et convallis est risus vitae nisi. Suspendisse potenti. Donec ultricies consectetur lorem, eget tempor nisi cursus in. Vivamus at nulla eros. Sed nec malesuada mauris. Curabitur id ex sed neque rutrum tincidunt. Sed sed lectus nec libero eleifend luctus. Aenean convallis feugiat elit, non tincidunt eros vehicula sed. Phasellus pretium urna sit amet risus interdum tempor.",
    },
  ],
}: Props) {
  return (
    <div class="container lg:mx-auto mx-4 text-sm py-12 lg:py-28">
      <div class="flex flex-col lg:flex-row gap-10 lg:gap-20 justify-between">
        <div class="flex-none space-y-6 lg:w-2/5">
          <p class="text-4xl leading-snug">
            {title}
          </p>
          <p class="text-lg">
            {description}
          </p>
          <a
            key={cta?.id}
            id={cta?.id}
            href={cta?.href}
            target={cta?.href.includes("http") ? "_blank" : "_self"}
            class={`font-normal btn btn-primary ${
              cta.outline && "btn-outline"
            }`}
          >
            {cta?.text}
          </a>
        </div>
        <div class="flex-auto border-primary border-t">
          {questions?.map((question) => (
            <details class="border-primary border-b group">
              <summary class="text-lg cursor-pointer py-6 flex ">
                <span class="flex-auto">{question.title}</span>
                <span class="flex-none transition group-open:rotate-180">
                  <Icon
                    id="ChevronDown"
                    width={32}
                    height={33}
                    class="stroke-2"
                  />
                </span>
              </summary>
              <p
                class="leading-relaxed mb-6 group-open:animate-fadeIn"
                dangerouslySetInnerHTML={{ __html: question.answer }}
              >
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
