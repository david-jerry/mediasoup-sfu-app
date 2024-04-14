const IsJsonString = (msg: string) => {
    try {
        JSON.parse(msg);
    } catch (error) {
        return false;
    }

    return true;
}

export { IsJsonString }