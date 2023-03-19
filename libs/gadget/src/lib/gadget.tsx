import styles from './gadget.module.css'

/* eslint-disable-next-line */
export interface GadgetProps {}

export function Gadget(props: GadgetProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Gadget!</h1>
    </div>
  )
}

export default Gadget
