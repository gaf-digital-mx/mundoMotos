import { CheckIcon, DashIcon } from '@/shared/ui/icons';

import type { ServiceDetail } from './service-detail';

type Props = Pick<ServiceDetail, 'title' | 'table' | 'works'>;

/** A glyph alone says nothing: the row's answer is spelled out for assistive tech. */
function Mark({ included, yes, no }: { included: boolean; yes: string; no: string }) {
  return (
    <>
      {included ? (
        <CheckIcon className="mx-auto size-18 text-ignition-gold" />
      ) : (
        <DashIcon className="mx-auto size-18 text-ash-gray" />
      )}
      <span className="sr-only">{included ? yes : no}</span>
    </>
  );
}

/**
 * What a service covers, per vehicle. A table rather than a list with a footnote: the one line
 * that differs between a motorcycle and a scooter is the reason the table exists, and in a list
 * it would be an exception the reader has to apply themselves.
 */
export function ServiceWorksTable({ title, table, works }: Props) {
  return (
    <table className="w-full border-collapse text-left text-caption md:text-nav-label">
      {/* The table's own title: a caption is announced with it, where a heading above would
          float free of the rows it names. */}
      <caption className="mb-12 text-left text-nav-label font-semibold tracking-label text-bone-white uppercase">
        {title}
      </caption>
      <thead>
        <tr className="border-b border-ash-gray/40">
          <th scope="col" className="py-6 font-normal text-silver-mist">
            {table.work}
          </th>
          <th scope="col" className="w-[4.5rem] px-6 py-6 text-center font-normal text-silver-mist">
            {table.bike}
          </th>
          <th scope="col" className="w-[4.5rem] px-6 py-6 text-center font-normal text-silver-mist">
            {table.scooter}
          </th>
        </tr>
      </thead>
      <tbody>
        {works.map((work) => (
          <tr key={work.id} className="border-b border-ash-gray/20 last:border-b-0">
            <th scope="row" className="py-6 font-normal text-bone-white">
              {work.label}
            </th>
            <td className="px-6 py-6">
              <Mark included yes={table.yes} no={table.no} />
            </td>
            <td className="px-6 py-6">
              <Mark included={work.scooter} yes={table.yes} no={table.no} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
