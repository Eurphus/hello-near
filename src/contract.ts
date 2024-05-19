import { NearBindgen, near, call, view, NearPromise, UnorderedMap } from 'near-sdk-js';

@NearBindgen({})
class NearlyDone {
  tasks: Array<any> = [];
  ID: number = 0;
  monthly_charity_name: string = '';
  monthly_charity_address: string = '';
  voting_list = new UnorderedMap("v");
  greeting: string = "Hello";

  //
  // Tasks
  //
  @call({ payableFunction: true })
  add_task({ name, description, day, time }: { name: string, description: string, day: string, time: string}): void {
    near.log(`Adding task ${name}`);
    this.ID++;

    let user = near.predecessorAccountId();
    let userAMT = near.attachedDeposit();
    near.log(userAMT);
    userAMT -= near.usedGas();
    let converted = Number(userAMT) / (10 ** 24);
    near.log(userAMT);

    let task = {
      task: name,
      id: this.ID,
      description: description,
      day: day,
      time: time,
      staked: converted,
      creator: user,
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
    near.log("Fundamental error ):")
    throw new Error("Attempted to fetch an ID that does not exist")
  }

  // You will see this called before most important functions, this is because I could not find a way to make it run on a timer
  // in a reasonable way. The easy implementation is to call it every once in a while - despite it being expensive to run
  @call({})
  check_expired_tasks(): void {
    const currentTime = new Date();
    for (let i = 0; i < this.tasks.length; i++) {
      let taskTime = new Date(`${this.tasks[i].day}T${this.tasks[i].time}`);
      if (taskTime < currentTime && !this.tasks[i].fulfilled) {
        near.log(`Task ${this.tasks[i].id} is expired. Transferring funds to charity of the month ${this.monthly_charity_name}`);
        //near.promiseBatchCreate(this.monthly_charity_name);
        //near.promiseBatchActionTransfer(this.tasks[i].staked, 0);
        this.tasks[i].fulfilled = true;
      }
    }
  }

  @view({})
  get_tasks(): Array<any> {
    return this.tasks;
  }

  //
  // Charity
  //
  @call({})
  set_charity({ charity_name }: { charity_name: string}): void {
    
  }
}