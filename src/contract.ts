import { NearBindgen, near, call, view, NearPromise, UnorderedMap } from 'near-sdk-js';

@NearBindgen({})
class NearlyDone {
  tasks: Array<any> = [];
  ID: number = 0;
  last_checked: string = "05/20/2024T00:00"

  //
  // Tasks
  //
  @call({ payableFunction: true })
  add_task({ name, description, day, time, charity = "sickkids.testnet" }: { name: string, description: string, day: string, time: string, charity : string }): void {
    near.log(`Adding task ${name}`);
    this.ID++;

    let user = near.predecessorAccountId();
    let userAMT = near.attachedDeposit();
    userAMT -= near.usedGas();
    let converted = Number(userAMT) / (10 ** 24);

    if (converted < 0.01) {
      throw new Error("Must send more than 0.01 NEAR")
    }

    let task = {
      task: name,
      id: this.ID,
      description: description,
      day: day,
      time: time,
      staked: converted,
      creator: user,
      charity: charity,
      fulfilled: false
    }

    this.tasks.push(task);
  }

  @call({})
  fulfill_task({ id }: { id: number }): NearPromise {
    for (let i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) {
        let task = this.tasks[i];
        if (task.fulfilled) {
          throw new Error(`Task ${id} is already fulfilled`);
        }
        task.fulfilled = true;
        near.log(`Task ${id} found! Fulfilling and returning stake...`);
        let userAMT = BigInt(task.staked * (10 ** 24));
        return NearPromise.new(task.creator).transfer(userAMT);
      }
    }
    throw new Error("Attempted to fetch an ID that does not exist")
  }

  // You will see this called before most important functions, this is because I could not find a way to make it run on a timer
  // in a reasonable way. The easy implementation is to call it every once in a while - despite it being expensive to run
  @view({})
  check_expired_tasks(): void {
    const currentTime = new Date();
    for (let i = 0; i < this.tasks.length; i++) {
      let task = this.tasks[i]
      let taskTime = new Date(`${task.day}T${task.time}`);
      if (taskTime < currentTime && !task.fulfilled) {
        let userAMT = BigInt(task.staked * (10 ** 24));
        NearPromise.new(task.charity_address).transfer(userAMT)
        task.fulfilled = true;
      }
    }
  }

  @view({})
  get_tasks({ user_id }: { user_id: string }): Array<any> {
    // Filter Disabled, encountering bugs on frontend
    this.check_expired_tasks();
    return this.tasks

    // return this.tasks.filter(task => 
    //   task.creator == user_id 
    // );
  }
}