import Image from "apps/website/components/Image.tsx";
import type { ImageWidget } from "apps/admin/widgets.ts";
import Icon, { AvailableIcons } from "site/components/ui/Icon.tsx";

export interface Column {
  title: string;
  items: Items[];
}

export interface Items {
  label: string;
  href: string;
}

export interface Subscribe {
  title?: string;
  description?: string;
  /** @format rich-text */
  instructions?: string;
}

export interface Social {
  network: "Facebook" | "Instagram" | "Linkedin" | "X - Twitter" | "Youtube";
  href: string;
}

export interface Props {
  logo?: {
    src?: ImageWidget;
    alt?: string;
  };
  links?: Column[];
  subscribe?: Subscribe;
  madeWith?: {
    label?: string;
    src?: ImageWidget;
    href?: string;
  };
  copyright?: string;
  bottomLinks?: Items[];
  social?: Social[];
}

export default function Footer({
  logo = {
    src:
      "https://ozksgdmyrqcxcwhnbepg.supabase.co/storage/v1/object/public/assets/1527/67120bcd-936a-4ea5-a760-02ed5c4a3d04",
    alt: "Logo",
  },
  links = [
    {
      title: "Column One",
      items: [
        { label: "Link One", href: "/" },
        { label: "Link Two", href: "/" },
        { label: "Link Three", href: "/" },
        { label: "Link Four", href: "/" },
        { label: "Link Five", href: "/" },
      ],
    },
    {
      title: "Column Two",
      items: [
        { label: "Link Six", href: "/" },
        { label: "Link Seven", href: "/" },
        { label: "Link Eight", href: "/" },
        { label: "Link Nine", href: "/" },
        { label: "Link Ten", href: "/" },
      ],
    },
    {
      title: "Column Three",
      items: [
        { label: "Link Eleven", href: "/" },
        { label: "Link Twelve", href: "/" },
        { label: "Link FourThirteenteen", href: "/" },
        { label: "Link Fourteen", href: "/" },
        { label: "Link Fifteen", href: "/" },
      ],
    },
  ],
  subscribe = {
    title: "Subcribe",
    description:
      "Join our newsletter to stay up to date on features and releases.",
    instructions:
      "By subscribing you agree to with our <a href='/' target='_blank' class='link'>Privacy Policy</a> and provide consent to receive updates from our company.",
  },
  madeWith = {
    label: "Made with",
    src:
      "https://ozksgdmyrqcxcwhnbepg.supabase.co/storage/v1/object/public/assets/1527/cc202be0-af57-4b32-b9c9-d1d7dc97bf85",
    href: "https://deco.cx",
  },
  copyright = "© 2024 deco.cx. All rights reserved.",
  bottomLinks = [
    { label: "Privacy Policy", href: "/" },
    { label: "Terms of Service", href: "/" },
    { label: "Cookies Settings", href: "/" },
  ],
  social = [
    { network: "Facebook", href: "" },
    { network: "Instagram", href: "" },
    { network: "X - Twitter", href: "" },
    { network: "Linkedin", href: "" },
    { network: "Youtube", href: "" },
  ],
}: Props) {
  return (
    <div class="lg:container lg:mx-auto md:max-w-6xl mx-4 pt-16 text-sm">
      <div class="flex flex-col gap-20">
        <div class="flex flex-col gap-6 justify-between lg:flex-row">
          <div>
            <Image
              src={logo.src || ""}
              width={100}
              height={28}
              alt={logo.alt}
            />
          </div>
          <div class="flex gap-9">
            {links?.map((link) => (
              <div>
                <h4 class="font-semibold mb-4">{link.title}</h4>
                {link.items?.map((item) => (
                  <a
                    class="block hover:underline link no-underline py-1"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div class="lg:w-[40%]">
            <h4 class="font-semibold mb-4">{subscribe?.title}</h4>
            <form class="flex flex-col gap-4">
              <p class="font-normal">{subscribe.description}</p>
              <div class="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter your email"
                  class="flex-auto input input-bordered input-primary"
                />
                <button
                  type="submit"
                  class="btn btn-outline font-normal"
                  aria-label="Subscribe"
                >
                  Subscribe
                </button>
              </div>
              {subscribe.instructions && (
                <p
                  class="text-xs"
                  dangerouslySetInnerHTML={{ __html: subscribe.instructions }}
                >
                </p>
              )}
            </form>
          </div>
        </div>
        <div class="border-primary border-t flex flex-col gap-4 items-center justify-between lg:flex-row lg:items-center py-8">
          <div class="flex flex-col gap-4 items-center lg:flex-row lg:gap-6">
            <a
              href={madeWith?.href}
              class="flex items-center gap-2"
              target="_blank"
            >
              <span>{madeWith?.label}</span>
              <Image
                src={madeWith?.src || ""}
                width={100}
                height={28}
                alt={madeWith?.label}
              />
            </a>
            <span>{copyright}</span>
            <div class="flex gap-2 justify-between lg:gap-6">
              {bottomLinks?.map((item) => (
                <a class="link" href={item.href} target="_blank">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div class="flex gap-3">
            {social?.map((item) => (
              <a class="block" href={item.href} target="_blank">
                <Icon
                  id={item.network as AvailableIcons}
                  width={24}
                  height={25}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
